package main

import (
	"flag"
	"fmt"
	"go-yt-dlp/downloader"
	"go-yt-dlp/yandex"
	"io"
	"log"
	"os"
	"path/filepath"
	"time"
)

func main() {
	// Command line flags
	var keepFile = flag.Bool("keep", false, "Keep the local file after upload")
	var logFile = flag.String("log", "", "Log file path (default: auto-generated)")
	var verbose = flag.Bool("v", false, "Verbose logging")
	flag.Parse()

	// Setup logging
	if err := setupLogging(*logFile, *verbose); err != nil {
		fmt.Printf("Failed to setup logging: %v\n", err)
		os.Exit(1)
	}

	args := flag.Args()
	if len(args) != 1 {
		log.Println("Usage: program [options] <video_id>")
		log.Println("Options:")
		log.Println("  -keep         Keep the local file after successful upload")
		log.Println("  -log <file>   Specify log file (default: auto-generated)")
		log.Println("  -v            Verbose logging")
		log.Println("Example: program R6kU-N6GBz8")
		log.Println("Example: program -keep -v R6kU-N6GBz8")
		log.Println("Example: program -log upload.log R6kU-N6GBz8")
		os.Exit(1)
	}

	videoID := args[0]
	configFile := "config.yaml"

	log.Printf("=== Starting YouTube Download & Upload Process ===")
	log.Printf("Video ID: %s", videoID)
	log.Printf("Config: %s", configFile)
	log.Printf("Keep file: %v", *keepFile)
	log.Printf("Time: %s", time.Now().Format("2006-01-02 15:04:05"))

	log.Println("Initializing downloader...")
	dl, err := downloader.NewDownloader(configFile)
	if err != nil {
		log.Fatalf("Downloader init failed: %v\n", err)
	}

	log.Printf("Downloading video %s...\n", videoID)
	filePath, err := dl.Download(videoID)
	if err != nil {
		log.Fatalf("Download failed: %v\n", err)
	}
	log.Printf("Successfully downloaded to: %s\n", filePath)

	log.Println("Initializing Yandex client...")
	yd, err := yandex.NewYandexClient(configFile)
	if err != nil {
		log.Fatalf("Yandex client init failed: %v\n", err)
	}

	remoteFilename := filepath.Base(filePath)
	log.Printf("Uploading %s to Yandex.Disk...\n", remoteFilename)

	// Try multiple upload strategies
	if err := tryUploadWithStrategies(yd, filePath, remoteFilename); err != nil {
		log.Fatalf("All upload strategies failed: %v\n", err)
	}

	log.Println("Video successfully uploaded to Yandex.Disk")

	// Delete the local file after successful upload (unless -keep flag is used)
	if !*keepFile {
		log.Printf("Deleting local file: %s\n", filePath)
		if err := os.Remove(filePath); err != nil {
			log.Printf("Warning: Failed to delete local file %s: %v\n", filePath, err)
			log.Println("You may want to delete it manually to save disk space")
		} else {
			log.Printf("✅ Local file %s deleted successfully\n", filePath)

			// Also try to clean up the downloads directory if it's empty
			downloadDir := filepath.Dir(filePath)
			if isEmpty, _ := isDirEmpty(downloadDir); isEmpty {
				log.Printf("Downloads directory %s is empty, removing it\n", downloadDir)
				os.Remove(downloadDir) // This will only succeed if directory is truly empty
			}
		}
	} else {
		log.Printf("📁 Local file kept: %s\n", filePath)
	}

	log.Println("=== Process completed successfully ===")
}

// setupLogging configures logging to both console and file
func setupLogging(logFile string, verbose bool) error {
	// Create logs directory if it doesn't exist
	logsDir := "logs"
	if err := os.MkdirAll(logsDir, 0755); err != nil {
		return fmt.Errorf("failed to create logs directory: %w", err)
	}

	// Generate log file name if not provided
	if logFile == "" {
		timestamp := time.Now().Format("2006-01-02_15-04-05")
		logFile = filepath.Join(logsDir, fmt.Sprintf("upload_%s.log", timestamp))
	}

	// Open log file
	file, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		return fmt.Errorf("failed to open log file: %w", err)
	}

	// Setup multi-writer (console + file)
	var writers []io.Writer
	writers = append(writers, os.Stdout) // Always log to console
	writers = append(writers, file)      // Always log to file

	multiWriter := io.MultiWriter(writers...)

	// Configure log format
	logFlags := log.LstdFlags | log.Lshortfile
	if verbose {
		logFlags |= log.Lmicroseconds
	}

	log.SetOutput(multiWriter)
	log.SetFlags(logFlags)

	// Log the logging setup
	fmt.Printf("Logging to: %s\n", logFile)
	log.Printf("=== Logging initialized ===")
	log.Printf("Log file: %s", logFile)
	log.Printf("Verbose mode: %v", verbose)

	return nil
}

func tryUploadWithStrategies(yd *yandex.YandexClient, filePath, remoteFilename string) error {
	log.Printf("=== Starting upload strategies for file: %s ===", filePath)

	// Get file info for logging
	if fileInfo, err := os.Stat(filePath); err == nil {
		log.Printf("File size: %.2f MB", float64(fileInfo.Size())/1024/1024)
		log.Printf("File modified: %s", fileInfo.ModTime().Format("2006-01-02 15:04:05"))
	}

	strategies := []struct {
		name string
		fn   func() error
	}{
		{
			name: "Standard Upload",
			fn:   func() error { return yd.Upload(filePath, remoteFilename) },
		},
		{
			name: "Chunked Upload",
			fn:   func() error { return yd.ChunkedUpload(filePath, remoteFilename) },
		},
	}

	for i, strategy := range strategies {
		log.Printf("=== Trying Strategy %d/%d: %s ===", i+1, len(strategies), strategy.name)

		start := time.Now()
		err := strategy.fn()
		duration := time.Since(start)

		if err == nil {
			log.Printf("✅ Strategy '%s' succeeded in %v", strategy.name, duration)
			log.Printf("Successfully uploaded: %s -> %s", filePath, remoteFilename)
			return nil
		}

		log.Printf("❌ Strategy '%s' failed after %v: %v", strategy.name, duration, err)

		if i < len(strategies)-1 {
			waitTime := 10 * time.Second
			log.Printf("Waiting %v before trying next strategy...", waitTime)
			time.Sleep(waitTime)
		}
	}

	log.Printf("=== All upload strategies failed ===")
	return fmt.Errorf("all upload strategies failed")
}

// isDirEmpty checks if a directory is empty
func isDirEmpty(dirPath string) (bool, error) {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return false, err
	}
	return len(entries) == 0, nil
}
