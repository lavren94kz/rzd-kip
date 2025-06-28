package yandex

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

type YandexClient struct {
	oauthToken string
	uploadPath string
	httpClient *http.Client
	baseURL    string
}

func NewYandexClient(configPath string) (*YandexClient, error) {
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config: %w", err)
	}

	var config struct {
		Yandex struct {
			OAuthToken string `yaml:"oauth_token"`
			UploadPath string `yaml:"upload_path"`
		} `yaml:"yandex"`
	}
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse config: %w", err)
	}

	if config.Yandex.OAuthToken == "" {
		return nil, fmt.Errorf("oauth_token is required")
	}

	uploadPath := strings.TrimSuffix(config.Yandex.UploadPath, "/")
	if !strings.HasPrefix(uploadPath, "/") {
		uploadPath = "/" + uploadPath
	}

	return &YandexClient{
		oauthToken: config.Yandex.OAuthToken,
		uploadPath: uploadPath,
		httpClient: &http.Client{
			Timeout: 30 * time.Minute, // Increased overall timeout
			Transport: &http.Transport{
				DisableKeepAlives:     false,
				DisableCompression:    true, // Disable compression for uploads
				MaxIdleConns:          10,
				IdleConnTimeout:       90 * time.Second,
				TLSHandshakeTimeout:   10 * time.Second,
				ExpectContinueTimeout: 1 * time.Second,
			},
		},
		baseURL: "https://cloud-api.yandex.net/v1/disk",
	}, nil
}

// ProgressReader wraps an io.Reader to provide upload progress
type ProgressReader struct {
	reader     io.Reader
	total      int64
	current    int64
	lastLog    time.Time
	lastBytes  int64
	stuckCount int
}

func (pr *ProgressReader) Read(p []byte) (int, error) {
	n, err := pr.reader.Read(p)
	pr.current += int64(n)

	// Log progress every 5 seconds
	if time.Since(pr.lastLog) > 5*time.Second {
		progress := float64(pr.current) / float64(pr.total) * 100

		// Check if we're stuck (no progress in last 5 seconds)
		if pr.current == pr.lastBytes {
			pr.stuckCount++
			log.Printf("[UPLOAD] Progress: %.1f%% (%.2f/%.2f MB) - STALLED for %d intervals",
				progress,
				float64(pr.current)/1024/1024,
				float64(pr.total)/1024/1024,
				pr.stuckCount)
		} else {
			pr.stuckCount = 0
			bytesPerSec := float64(pr.current-pr.lastBytes) / 5.0
			log.Printf("[UPLOAD] Progress: %.1f%% (%.2f/%.2f MB) - Speed: %.1f KB/s",
				progress,
				float64(pr.current)/1024/1024,
				float64(pr.total)/1024/1024,
				bytesPerSec/1024)
		}

		pr.lastBytes = pr.current
		pr.lastLog = time.Now()
	}

	return n, err
}

func (yc *YandexClient) Upload(localPath, remoteFilename string) error {
	const maxRetries = 3

	for attempt := 1; attempt <= maxRetries; attempt++ {
		log.Printf("[UPLOAD] Attempt %d/%d", attempt, maxRetries)

		err := yc.uploadAttempt(localPath, remoteFilename)
		if err == nil {
			log.Printf("[UPLOAD] Upload completed successfully")
			return nil
		}

		log.Printf("[UPLOAD] Attempt %d failed: %v", attempt, err)

		if attempt < maxRetries {
			waitTime := time.Duration(attempt) * 10 * time.Second
			log.Printf("[UPLOAD] Waiting %v before retry...", waitTime)
			time.Sleep(waitTime)
		}
	}

	return fmt.Errorf("upload failed after %d attempts", maxRetries)
}

func (yc *YandexClient) uploadAttempt(localPath, remoteFilename string) error {
	// 1. Получаем URL для загрузки
	uploadURL, err := yc.getUploadURL(remoteFilename)
	if err != nil {
		return fmt.Errorf("failed to get upload URL: %w", err)
	}
	log.Printf("[UPLOAD] Received upload URL: %s", uploadURL)

	// 2. Открываем файл
	file, err := os.Open(localPath)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	fileInfo, err := file.Stat()
	if err != nil {
		return fmt.Errorf("failed to get file info: %w", err)
	}
	log.Printf("[UPLOAD] File size: %.2f MB", float64(fileInfo.Size())/1024/1024)

	// 3. Создаем прогресс-ридер
	progressReader := &ProgressReader{
		reader:    file,
		total:     fileInfo.Size(),
		lastLog:   time.Now(),
		lastBytes: 0,
	}

	// 4. Создаем запрос
	req, err := http.NewRequest("PUT", uploadURL, progressReader)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Устанавливаем заголовки
	req.ContentLength = fileInfo.Size()
	req.Header.Set("Content-Type", "application/octet-stream")

	// 5. Создаем контекст с увеличенным таймаутом для финализации
	baseTimeout := 8 * time.Minute
	sizeTimeout := time.Duration(fileInfo.Size()/1024/1024) * 2 * time.Second // 2 сек на MB
	finalizeTimeout := 2 * time.Minute                                        // Дополнительное время на финализацию

	totalTimeout := baseTimeout + sizeTimeout + finalizeTimeout
	ctx, cancel := context.WithTimeout(context.Background(), totalTimeout)
	defer cancel()

	log.Printf("[UPLOAD] Starting upload with timeout: %v", totalTimeout)

	// 6. Выполняем запрос
	start := time.Now()
	resp, err := yc.httpClient.Do(req.WithContext(ctx))
	duration := time.Since(start)

	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return fmt.Errorf("upload timeout after %v (total timeout: %v)", duration, totalTimeout)
		}
		return fmt.Errorf("upload request failed after %v: %w", duration, err)
	}
	defer resp.Body.Close()

	log.Printf("[UPLOAD] Upload request completed in %v", duration)

	// 7. Проверяем результат
	bodyBytes, _ := io.ReadAll(resp.Body)
	log.Printf("[UPLOAD] Response status: %d", resp.StatusCode)
	if len(bodyBytes) > 0 {
		log.Printf("[UPLOAD] Response body: %s", string(bodyBytes))
	}

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		return fmt.Errorf("upload failed (status %d): %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

func (yc *YandexClient) getUploadURL(filename string) (string, error) {
	// Правильно экранируем путь
	remotePath := yc.uploadPath + "/" + filename

	// Строим URL с параметрами
	reqURL := fmt.Sprintf("%s/resources/upload", yc.baseURL)

	req, err := http.NewRequest("GET", reqURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	// Добавляем параметры запроса
	q := req.URL.Query()
	q.Add("path", remotePath)
	q.Add("overwrite", "true")
	req.URL.RawQuery = q.Encode()

	req.Header.Set("Authorization", "OAuth "+yc.oauthToken)

	log.Printf("[API] Requesting upload URL for path: %s", remotePath)
	log.Printf("[API] Full URL: %s", req.URL.String())

	resp, err := yc.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	log.Printf("[API] Response status: %d", resp.StatusCode)
	log.Printf("[API] Response body: %s", string(bodyBytes))

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(bodyBytes))
	}

	var result struct {
		Href string `json:"href"`
	}
	if err = json.NewDecoder(strings.NewReader(string(bodyBytes))).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if result.Href == "" {
		return "", fmt.Errorf("empty href in response")
	}

	return result.Href, nil
}

// ChunkedUpload handles large file uploads in chunks
func (yc *YandexClient) ChunkedUpload(localPath, remoteFilename string) error {
	const chunkSize = 10 * 1024 * 1024 // 10MB chunks

	file, err := os.Open(localPath)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	fileInfo, err := file.Stat()
	if err != nil {
		return fmt.Errorf("failed to get file info: %w", err)
	}

	log.Printf("[CHUNKED] File size: %.2f MB, chunk size: %.2f MB",
		float64(fileInfo.Size())/1024/1024,
		float64(chunkSize)/1024/1024)

	// For files smaller than chunk size, use regular upload
	if fileInfo.Size() <= chunkSize {
		log.Println("[CHUNKED] File is small, using regular upload")
		return yc.uploadAttempt(localPath, remoteFilename)
	}

	// For larger files, we'll use conservative upload strategies
	return yc.uploadWithCompression(localPath, remoteFilename)
}

// uploadWithCompression tries different upload strategies for large files
func (yc *YandexClient) uploadWithCompression(localPath, remoteFilename string) error {
	// Strategy 1: Direct upload with very conservative settings
	log.Println("[UPLOAD] Trying conservative upload...")
	if err := yc.conservativeUpload(localPath, remoteFilename); err == nil {
		return nil
	}

	// Strategy 2: Upload with ultra-conservative settings
	log.Println("[UPLOAD] Trying ultra-conservative upload...")
	return yc.ultraConservativeUpload(localPath, remoteFilename)
}

func (yc *YandexClient) conservativeUpload(localPath, remoteFilename string) error {
	uploadURL, err := yc.getUploadURL(remoteFilename)
	if err != nil {
		return fmt.Errorf("failed to get upload URL: %w", err)
	}

	file, err := os.Open(localPath)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	fileInfo, err := file.Stat()
	if err != nil {
		return fmt.Errorf("failed to get file info: %w", err)
	}

	// Create a very conservative HTTP client
	conservativeClient := &http.Client{
		Timeout: 30 * time.Minute,
		Transport: &http.Transport{
			DisableKeepAlives:     true, // Force new connection
			DisableCompression:    true,
			MaxIdleConns:          1,
			MaxIdleConnsPerHost:   1,
			IdleConnTimeout:       30 * time.Second,
			TLSHandshakeTimeout:   30 * time.Second,
			ExpectContinueTimeout: 10 * time.Second,
		},
	}

	req, err := http.NewRequest("PUT", uploadURL, file)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.ContentLength = fileInfo.Size()
	req.Header.Set("Content-Type", "application/octet-stream")
	req.Header.Set("Connection", "close") // Ensure connection closes after upload

	ctx, cancel := context.WithTimeout(context.Background(), 25*time.Minute)
	defer cancel()

	log.Printf("[CONSERVATIVE] Starting conservative upload...")
	resp, err := conservativeClient.Do(req.WithContext(ctx))
	if err != nil {
		return fmt.Errorf("conservative upload failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("conservative upload failed (status %d): %s", resp.StatusCode, string(bodyBytes))
	}

	log.Printf("[CONSERVATIVE] Upload successful")
	return nil
}

func (yc *YandexClient) ultraConservativeUpload(localPath, remoteFilename string) error {
	uploadURL, err := yc.getUploadURL(remoteFilename)
	if err != nil {
		return fmt.Errorf("failed to get upload URL: %w", err)
	}

	file, err := os.Open(localPath)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	fileInfo, err := file.Stat()
	if err != nil {
		return fmt.Errorf("failed to get file info: %w", err)
	}

	// Ultra-conservative client
	ultraClient := &http.Client{
		Timeout: 45 * time.Minute,
		Transport: &http.Transport{
			DisableKeepAlives:     true,
			DisableCompression:    true,
			MaxIdleConns:          0,
			MaxIdleConnsPerHost:   0,
			MaxConnsPerHost:       1,
			IdleConnTimeout:       10 * time.Second,
			TLSHandshakeTimeout:   60 * time.Second,
			ResponseHeaderTimeout: 5 * time.Minute,
			ExpectContinueTimeout: 30 * time.Second,
		},
	}

	// Create request with Expect: 100-continue header
	req, err := http.NewRequest("PUT", uploadURL, file)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.ContentLength = fileInfo.Size()
	req.Header.Set("Content-Type", "application/octet-stream")
	req.Header.Set("Expect", "100-continue")
	req.Header.Set("Connection", "close")

	ctx, cancel := context.WithTimeout(context.Background(), 40*time.Minute)
	defer cancel()

	log.Printf("[ULTRA] Starting ultra-conservative upload with Expect: 100-continue...")
	resp, err := ultraClient.Do(req.WithContext(ctx))
	if err != nil {
		return fmt.Errorf("ultra-conservative upload failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("ultra-conservative upload failed (status %d): %s", resp.StatusCode, string(bodyBytes))
	}

	log.Printf("[ULTRA] Upload successful")
	return nil
}
