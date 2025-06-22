package main

import (
	"go-yt-dlp/downloader"
	"go-yt-dlp/yandex"
	"log"
	"os"
	"path/filepath"
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	if len(os.Args) != 2 {
		log.Println("Usage: program <video_id>")
		log.Println("Example: program R6kU-N6GBz8")
		os.Exit(1)
	}

	videoID := os.Args[1]
	configFile := "config.yaml"

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
	if err := yd.Upload(filePath, remoteFilename); err != nil {
		log.Fatalf("Upload failed: %v\n", err)
	}

	log.Println("Video successfully uploaded to Yandex.Disk")
}
