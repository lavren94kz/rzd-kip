package downloader

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

type Downloader struct {
	config struct {
		CookiesPath string `yaml:"cookies_path"`
		OutputDir   string `yaml:"output_dir"`
	}
}

func NewDownloader(configPath string) (*Downloader, error) {
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config: %w", err)
	}

	var d Downloader
	if err := yaml.Unmarshal(data, &d.config); err != nil {
		return nil, fmt.Errorf("failed to parse config: %w", err)
	}

	// Create output directory if not exists
	if err := os.MkdirAll(d.config.OutputDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create output directory: %w", err)
	}

	return &d, nil
}

func (d *Downloader) Download(videoID string) (string, error) {
	// Проверяем существование файла cookies
	if _, err := os.Stat(d.config.CookiesPath); os.IsNotExist(err) {
		return "", fmt.Errorf("cookies file not found: %s", d.config.CookiesPath)
	}

	// Формируем команду yt-dlp
	cmd := exec.Command(
		"yt-dlp",
		"--cookies", d.config.CookiesPath,
		"-f", "bestvideo[ext=mp4][vcodec^=avc1]+bestaudio[ext=m4a]",
		"--merge-output-format", "mp4",
		"--embed-chapters",
		"--restrict-filenames",
		"--windows-filenames",
		"--no-write-info-json",
		"--paths", d.config.OutputDir, // Ключевое исправление!
		"-o", "%(title).200B [%(id)s].%(ext)s",
		fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID),
	)

	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	fmt.Printf("Downloading video %s to %s\n", videoID, d.config.OutputDir)

	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("yt-dlp failed: %w", err)
	}

	// Ищем скачанный файл
	entries, err := os.ReadDir(d.config.OutputDir)
	if err != nil {
		return "", fmt.Errorf("failed to read output directory: %w", err)
	}

	for _, entry := range entries {
		if strings.Contains(entry.Name(), videoID) && !entry.IsDir() {
			filePath := filepath.Join(d.config.OutputDir, entry.Name())
			fmt.Printf("Successfully downloaded: %s\n", filePath)
			return filePath, nil
		}
	}

	return "", fmt.Errorf("downloaded file not found for video ID %s", videoID)
}
