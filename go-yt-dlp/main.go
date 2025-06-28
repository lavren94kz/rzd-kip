package main

import (
	"flag"
	"fmt"
	"go-yt-dlp/downloader"
	"go-yt-dlp/peertube"
	"go-yt-dlp/yandex"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

type Config struct {
	UploadDestination string `yaml:"upload_destination"`
	DeleteAfterUpload bool   `yaml:"delete_after_upload"`
}

func main() {
	// Command line flags
	var keepFile = flag.Bool("keep", false, "Keep the local file after upload")
	var logFile = flag.String("log", "", "Log file path (default: auto-generated)")
	var verbose = flag.Bool("v", false, "Verbose logging")
	var destination = flag.String("dest", "", "Override upload destination: 'yandex' or 'peertube'")
	var videoName = flag.String("name", "", "Video name (required for PeerTube uploads)")
	var videoDesc = flag.String("desc", "", "Video description (optional for PeerTube uploads)")
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
		log.Println("  -keep         Keep the local file after upload (overrides config)")
		log.Println("  -log <file>   Specify log file (default: auto-generated)")
		log.Println("  -v            Verbose logging")
		log.Println("  -dest <dest>  Override upload destination: 'yandex' or 'peertube'")
		log.Println("  -name <name>  Video name (required for PeerTube uploads)")
		log.Println("  -desc <desc>  Video description (optional for PeerTube uploads)")
		log.Println("")
		log.Println("File deletion behavior:")
		log.Println("  - Set 'delete_after_upload: true/false' in config.yaml")
		log.Println("  - Use -keep flag to override config and preserve file")
		log.Println("")
		log.Println("Examples:")
		log.Println("  program R6kU-N6GBz8")
		log.Println("  program -keep -v R6kU-N6GBz8")
		log.Println("  program -dest yandex R6kU-N6GBz8")
		log.Println("  program -dest peertube -name \"My Video\" -desc \"Great content\" R6kU-N6GBz8")
		log.Println("  program -log upload.log -dest peertube -name \"Tutorial\" R6kU-N6GBz8")
		os.Exit(1)
	}

	videoID := args[0]
	configFile := "config.yaml"

	log.Printf("=== Starting YouTube Download & Upload Process ===")
	log.Printf("Video ID: %s", videoID)
	log.Printf("Config: %s", configFile)
	log.Printf("Keep file: %v", *keepFile)
	log.Printf("Time: %s", time.Now().Format("2006-01-02 15:04:05"))

	// Read configuration to determine upload destination and deletion policy
	uploadDest, shouldDelete, err := getUploadConfig(configFile, *destination, *keepFile)
	if err != nil {
		log.Fatalf("Failed to determine upload configuration: %v", err)
	}
	log.Printf("Upload destination: %s", uploadDest)
	log.Printf("Delete after upload: %v", shouldDelete)

	// Validate PeerTube requirements
	if uploadDest == "peertube" && *videoName == "" {
		log.Fatalf("PeerTube uploads require a video name. Use -name flag to specify it.")
	}

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

	// Prepare video metadata for upload
	finalVideoName := *videoName
	finalVideoDesc := *videoDesc

	// For PeerTube, use command line args; for Yandex, extract from filename
	if uploadDest == "peertube" {
		log.Printf("Video name: %s", finalVideoName)
		if finalVideoDesc != "" {
			log.Printf("Video description: %s", finalVideoDesc)
		} else {
			log.Printf("Video description: (using default from config)")
		}
	} else {
		// For Yandex, we still extract from filename for logging purposes
		finalVideoName = extractVideoName(filepath.Base(filePath))
		log.Printf("Extracted video name: %s", finalVideoName)
	}

	// Upload to the specified destination
	switch uploadDest {
	case "yandex":
		if err := uploadToYandex(configFile, filePath); err != nil {
			log.Fatalf("Yandex upload failed: %v", err)
		}
	case "peertube":
		if err := uploadToPeerTube(configFile, filePath, finalVideoName, finalVideoDesc); err != nil {
			log.Fatalf("PeerTube upload failed: %v", err)
		}
	default:
		log.Fatalf("Unsupported upload destination: %s (supported: yandex, peertube)", uploadDest)
	}

	log.Printf("Video successfully uploaded to %s", uploadDest)

	// Delete the local file after successful upload based on configuration and flags
	if shouldDelete {
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

func getUploadConfig(configFile, override string, keepFileFlag bool) (string, bool, error) {
	// Read from config file
	data, err := os.ReadFile(configFile)
	if err != nil {
		return "", false, fmt.Errorf("failed to read config: %w", err)
	}

	var config Config
	if err := yaml.Unmarshal(data, &config); err != nil {
		return "", false, fmt.Errorf("failed to parse config: %w", err)
	}

	// Determine upload destination
	var dest string
	if override != "" {
		// If override is provided via command line, use it
		override = strings.ToLower(override)
		if override != "yandex" && override != "peertube" {
			return "", false, fmt.Errorf("invalid destination override: %s (must be 'yandex' or 'peertube')", override)
		}
		dest = override
	} else {
		// Use config file setting
		dest = strings.ToLower(config.UploadDestination)
		if dest == "" {
			return "", false, fmt.Errorf("upload_destination not specified in config file")
		}
		if dest != "yandex" && dest != "peertube" {
			return "", false, fmt.Errorf("invalid upload_destination in config: %s (must be 'yandex' or 'peertube')", dest)
		}
	}

	// Determine deletion policy
	// Command line -keep flag overrides config setting
	shouldDelete := config.DeleteAfterUpload && !keepFileFlag

	return dest, shouldDelete, nil
}

func getUploadDestination(configFile, override string) (string, error) {
	// This function is deprecated, keeping for compatibility
	dest, _, err := getUploadConfig(configFile, override, false)
	return dest, err
}

func uploadToYandex(configFile, filePath string) error {
	log.Println("Initializing Yandex client...")
	yd, err := yandex.NewYandexClient(configFile)
	if err != nil {
		return fmt.Errorf("yandex client init failed: %w", err)
	}

	remoteFilename := filepath.Base(filePath)
	log.Printf("Uploading %s to Yandex.Disk...\n", remoteFilename)

	return tryUploadWithStrategies(yd, filePath, remoteFilename)
}

func uploadToPeerTube(configFile, filePath, videoName, videoDesc string) error {
	log.Println("Initializing PeerTube client...")
	pt, err := peertube.NewPeerTubeClient(configFile)
	if err != nil {
		return fmt.Errorf("peertube client init failed: %w", err)
	}

	log.Printf("Uploading video '%s' to PeerTube...\n", videoName)

	return tryPeerTubeUploadWithStrategies(pt, filePath, videoName, videoDesc)
}

func tryPeerTubeUploadWithStrategies(pt *peertube.PeerTubeClient, filePath, videoName, videoDesc string) error {
	log.Printf("=== Starting PeerTube upload strategies for file: %s ===", filePath)

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
			fn:   func() error { return pt.Upload(filePath, videoName, videoDesc) },
		},
		{
			name: "Retry Upload",
			fn:   func() error { return pt.ChunkedUpload(filePath, videoName, videoDesc) },
		},
	}

	for i, strategy := range strategies {
		log.Printf("=== Trying Strategy %d/%d: %s ===", i+1, len(strategies), strategy.name)

		start := time.Now()
		err := strategy.fn()
		duration := time.Since(start)

		if err == nil {
			log.Printf("✅ Strategy '%s' succeeded in %v", strategy.name, duration)
			log.Printf("Successfully uploaded: %s -> %s", filePath, videoName)
			return nil
		}

		log.Printf("❌ Strategy '%s' failed after %v: %v", strategy.name, duration, err)

		if i < len(strategies)-1 {
			waitTime := 10 * time.Second
			log.Printf("Waiting %v before trying next strategy...", waitTime)
			time.Sleep(waitTime)
		}
	}

	log.Printf("=== All PeerTube upload strategies failed ===")
	return fmt.Errorf("all upload strategies failed")
}

func extractVideoName(filename string) string {
	// Remove extension
	name := strings.TrimSuffix(filename, filepath.Ext(filename))

	// Try to extract title from yt-dlp format: "Title [video_id]"
	if idx := strings.LastIndex(name, " ["); idx != -1 {
		name = name[:idx]
	}

	// Clean up the name
	name = strings.TrimSpace(name)
	if name == "" {
		name = "Downloaded Video"
	}

	return name
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
	log.Printf("=== Starting Yandex upload strategies for file: %s ===", filePath)

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
