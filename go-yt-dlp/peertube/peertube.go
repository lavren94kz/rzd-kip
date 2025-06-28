package peertube

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

type PeerTubeClient struct {
	serverURL       string
	accessToken     string
	channelID       int
	privacy         int
	waitTranscoding bool
	defaultDesc     string
	httpClient      *http.Client
}

type UploadResponse struct {
	Video struct {
		ID          int    `json:"id"`
		UUID        string `json:"uuid"`
		Name        string `json:"name"`
		Description string `json:"description"`
		Privacy     struct {
			ID    int    `json:"id"`
			Label string `json:"label"`
		} `json:"privacy"`
		Channel struct {
			ID          int    `json:"id"`
			Name        string `json:"name"`
			DisplayName string `json:"displayName"`
		} `json:"channel"`
	} `json:"video"`
}

func NewPeerTubeClient(configPath string) (*PeerTubeClient, error) {
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config: %w", err)
	}

	var config struct {
		PeerTube struct {
			ServerURL       string `yaml:"server_url"`
			AccessToken     string `yaml:"access_token"`
			ChannelID       int    `yaml:"channel_id"`
			Privacy         int    `yaml:"privacy"`
			WaitTranscoding bool   `yaml:"wait_transcoding"`
			DefaultDesc     string `yaml:"default_description"`
		} `yaml:"peertube"`
	}

	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse config: %w", err)
	}

	if config.PeerTube.ServerURL == "" {
		return nil, fmt.Errorf("server_url is required")
	}
	if config.PeerTube.AccessToken == "" {
		return nil, fmt.Errorf("access_token is required")
	}
	if config.PeerTube.ChannelID == 0 {
		return nil, fmt.Errorf("channel_id is required")
	}

	// Set defaults
	if config.PeerTube.Privacy == 0 {
		config.PeerTube.Privacy = 1 // Public by default
	}
	if config.PeerTube.DefaultDesc == "" {
		config.PeerTube.DefaultDesc = "Downloaded from YouTube"
	}

	// Remove trailing slash from server URL
	serverURL := strings.TrimSuffix(config.PeerTube.ServerURL, "/")

	return &PeerTubeClient{
		serverURL:       serverURL,
		accessToken:     config.PeerTube.AccessToken,
		channelID:       config.PeerTube.ChannelID,
		privacy:         config.PeerTube.Privacy,
		waitTranscoding: config.PeerTube.WaitTranscoding,
		defaultDesc:     config.PeerTube.DefaultDesc,
		httpClient: &http.Client{
			Timeout: 60 * time.Minute, // PeerTube uploads can take a while
			Transport: &http.Transport{
				DisableKeepAlives:     false,
				DisableCompression:    false,
				MaxIdleConns:          10,
				IdleConnTimeout:       90 * time.Second,
				TLSHandshakeTimeout:   10 * time.Second,
				ExpectContinueTimeout: 1 * time.Second,
			},
		},
	}, nil
}

// ProgressReader wraps an io.Reader to provide upload progress tracking
type ProgressReader struct {
	reader    io.Reader
	total     int64
	current   int64
	lastLog   time.Time
	lastBytes int64
}

func (pr *ProgressReader) Read(p []byte) (int, error) {
	n, err := pr.reader.Read(p)
	pr.current += int64(n)

	// Log progress every 5 seconds
	if time.Since(pr.lastLog) > 5*time.Second {
		progress := float64(pr.current) / float64(pr.total) * 100
		bytesPerSec := float64(pr.current-pr.lastBytes) / 5.0

		log.Printf("[PEERTUBE] Upload progress: %.1f%% (%.2f/%.2f MB) - Speed: %.1f KB/s",
			progress,
			float64(pr.current)/1024/1024,
			float64(pr.total)/1024/1024,
			bytesPerSec/1024)

		pr.lastBytes = pr.current
		pr.lastLog = time.Now()
	}

	return n, err
}

func (pt *PeerTubeClient) Upload(localPath, videoName, videoDesc string) error {
	return pt.uploadWithRetry(localPath, videoName, videoDesc, 3)
}

func (pt *PeerTubeClient) uploadWithRetry(localPath, videoName, videoDesc string, maxRetries int) error {
	for attempt := 1; attempt <= maxRetries; attempt++ {
		log.Printf("[PEERTUBE] Upload attempt %d/%d", attempt, maxRetries)

		err := pt.uploadAttempt(localPath, videoName, videoDesc)
		if err == nil {
			log.Printf("[PEERTUBE] Upload completed successfully")
			return nil
		}

		log.Printf("[PEERTUBE] Attempt %d failed: %v", attempt, err)

		if attempt < maxRetries {
			waitTime := time.Duration(attempt) * 10 * time.Second
			log.Printf("[PEERTUBE] Waiting %v before retry...", waitTime)
			time.Sleep(waitTime)
		}
	}

	return fmt.Errorf("upload failed after %d attempts", maxRetries)
}

func (pt *PeerTubeClient) uploadAttempt(localPath, videoName, videoDesc string) error {
	// Open the video file
	file, err := os.Open(localPath)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	// Get file info
	fileInfo, err := file.Stat()
	if err != nil {
		return fmt.Errorf("failed to get file info: %w", err)
	}

	log.Printf("[PEERTUBE] Uploading file: %s (%.2f MB)", filepath.Base(localPath), float64(fileInfo.Size())/1024/1024)

	// Determine description to use
	description := videoDesc
	if description == "" {
		description = pt.defaultDesc
		log.Printf("[PEERTUBE] Using default description: %s", description)
	} else {
		log.Printf("[PEERTUBE] Using provided description: %s", description)
	}

	// Create multipart form
	var requestBody bytes.Buffer
	writer := multipart.NewWriter(&requestBody)

	// Add form fields
	if err := writer.WriteField("name", videoName); err != nil {
		return fmt.Errorf("failed to write name field: %w", err)
	}

	if err := writer.WriteField("description", description); err != nil {
		return fmt.Errorf("failed to write description field: %w", err)
	}

	if err := writer.WriteField("channelId", strconv.Itoa(pt.channelID)); err != nil {
		return fmt.Errorf("failed to write channelId field: %w", err)
	}

	if err := writer.WriteField("privacy", strconv.Itoa(pt.privacy)); err != nil {
		return fmt.Errorf("failed to write privacy field: %w", err)
	}

	if err := writer.WriteField("waitTranscoding", strconv.FormatBool(pt.waitTranscoding)); err != nil {
		return fmt.Errorf("failed to write waitTranscoding field: %w", err)
	}

	// Add video file with progress tracking
	fileWriter, err := writer.CreateFormFile("videofile", filepath.Base(localPath))
	if err != nil {
		return fmt.Errorf("failed to create form file: %w", err)
	}

	// Create progress reader
	progressReader := &ProgressReader{
		reader:    file,
		total:     fileInfo.Size(),
		lastLog:   time.Now(),
		lastBytes: 0,
	}

	// Copy file content to form with progress tracking
	log.Printf("[PEERTUBE] Starting file upload...")
	start := time.Now()

	_, err = io.Copy(fileWriter, progressReader)
	if err != nil {
		return fmt.Errorf("failed to copy file content: %w", err)
	}

	// Close the multipart writer
	if err := writer.Close(); err != nil {
		return fmt.Errorf("failed to close multipart writer: %w", err)
	}

	copyDuration := time.Since(start)
	log.Printf("[PEERTUBE] File content copied in %v, preparing HTTP request...", copyDuration)

	// Create HTTP request
	uploadURL := fmt.Sprintf("%s/api/v1/videos/upload", pt.serverURL)
	req, err := http.NewRequest("POST", uploadURL, &requestBody)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Authorization", "Bearer "+pt.accessToken)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	// Create context with timeout
	baseTimeout := 15 * time.Minute
	sizeTimeout := time.Duration(fileInfo.Size()/1024/1024) * 3 * time.Second // 3 seconds per MB
	totalTimeout := baseTimeout + sizeTimeout

	ctx, cancel := context.WithTimeout(context.Background(), totalTimeout)
	defer cancel()

	// Execute request
	log.Printf("[PEERTUBE] Sending HTTP request to %s (timeout: %v)...", uploadURL, totalTimeout)
	requestStart := time.Now()

	resp, err := pt.httpClient.Do(req.WithContext(ctx))
	requestDuration := time.Since(requestStart)

	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return fmt.Errorf("upload timeout after %v (total timeout: %v)", requestDuration, totalTimeout)
		}
		return fmt.Errorf("upload request failed after %v: %w", requestDuration, err)
	}
	defer resp.Body.Close()

	log.Printf("[PEERTUBE] HTTP request completed in %v", requestDuration)

	// Read response
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %w", err)
	}

	log.Printf("[PEERTUBE] Response status: %d", resp.StatusCode)

	// Check response status
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		log.Printf("[PEERTUBE] Error response body: %s", string(respBody))
		return fmt.Errorf("upload failed with status %d: %s", resp.StatusCode, string(respBody))
	}

	// Parse successful response
	var uploadResp UploadResponse
	if err := json.Unmarshal(respBody, &uploadResp); err != nil {
		log.Printf("[PEERTUBE] Warning: failed to parse response JSON: %v", err)
		log.Printf("[PEERTUBE] Raw response: %s", string(respBody))
	} else {
		log.Printf("[PEERTUBE] Video uploaded successfully:")
		log.Printf("  - ID: %d", uploadResp.Video.ID)
		log.Printf("  - UUID: %s", uploadResp.Video.UUID)
		log.Printf("  - Name: %s", uploadResp.Video.Name)
		log.Printf("  - Channel: %s (%s)", uploadResp.Video.Channel.DisplayName, uploadResp.Video.Channel.Name)
		log.Printf("  - Privacy: %s", uploadResp.Video.Privacy.Label)
		log.Printf("  - URL: %s/w/%s", pt.serverURL, uploadResp.Video.UUID)
	}

	totalDuration := time.Since(start)
	log.Printf("[PEERTUBE] Total upload process completed in %v", totalDuration)

	return nil
}

// ChunkedUpload for compatibility with the interface
func (pt *PeerTubeClient) ChunkedUpload(localPath, videoName, videoDesc string) error {
	// PeerTube API doesn't support chunked uploads in the same way as Yandex
	// So we'll use the regular upload method with increased timeout
	log.Printf("[PEERTUBE] Using standard upload (PeerTube doesn't support chunked uploads)")
	return pt.Upload(localPath, videoName, videoDesc)
}
