package yandex

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
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
			Timeout: 10 * time.Minute,
		},
		baseURL: "https://cloud-api.yandex.net/v1/disk",
	}, nil
}

func (yc *YandexClient) Upload(localPath, remoteFilename string) error {
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

	// 3. Читаем файл в память (для небольших файлов)
	fileData, err := io.ReadAll(file)
	if err != nil {
		return fmt.Errorf("failed to read file: %w", err)
	}

	// 4. Создаем запрос
	req, err := http.NewRequest("PUT", uploadURL, bytes.NewReader(fileData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.ContentLength = int64(len(fileData))
	req.Header.Set("Authorization", "OAuth "+yc.oauthToken)
	req.Header.Set("Content-Type", "application/octet-stream")

	// 5. Выполняем запрос с таймаутом
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	log.Printf("[UPLOAD] Starting upload...")
	resp, err := yc.httpClient.Do(req.WithContext(ctx))
	if err != nil {
		return fmt.Errorf("upload request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("upload failed (status %d): %s", resp.StatusCode, string(bodyBytes))
	}

	log.Printf("[UPLOAD] Upload completed successfully")
	return nil
}

func (yc *YandexClient) getUploadURL(filename string) (string, error) {
	remotePath := fmt.Sprintf("%s/%s", yc.uploadPath, url.PathEscape(filename))
	reqURL := fmt.Sprintf("%s/resources/upload?path=%s&overwrite=true", yc.baseURL, remotePath)

	req, err := http.NewRequest("GET", reqURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "OAuth "+yc.oauthToken)

	resp, err := yc.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(bodyBytes))
	}

	var result struct {
		Href string `json:"href"`
	}
	if err = json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	return result.Href, nil
}
