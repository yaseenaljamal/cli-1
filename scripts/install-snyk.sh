#!/bin/bash

get_os_arch() {
    system=$(uname -s)
    machine=$(uname -m)

    if [ "$system" == "Linux" ]; then
        if [ "$machine" == "x86_64" ]; then
            echo "linux,amd64"
        elif [ "$machine" == "aarch64" ]; then
            echo "linux,arm64"
        else
            echo "Unsupported architecture for Linux. Aborting download."
            exit 1
        fi
    elif [ "$system" == "Windows" ]; then
        if [ "$machine" == "AMD64" ]; then
            echo "windows,amd64"
        else
            echo "Unsupported architecture for Windows. Aborting download."
            exit 1
        fi
    elif [ "$system" == "Darwin" ]; then
        if [ "$machine" == "x86_64" ]; then
            echo "macos,amd64"
        elif [ "$machine" == "arm64" ]; then
            echo "macos,arm64"
        else
            echo "Unsupported architecture for macOS. Aborting download."
            exit 1
        fi
    else
        echo "Unsupported operating system. Aborting download."
        exit 1
    fi
}

download_snyk_cli() {
    success=0
    fail=1

    os_arch=$(get_os_arch)
    IFS=',' read -r os_type arch_type <<< "$os_arch"

    if [ -z "$os_type" ] || [ -z "$arch_type" ]; then
        exit 1
    fi

    filename=""
    output_filename="snyk"

    if [ "$os_type" == "linux" ] && [ "$arch_type" == "arm64" ]; then
        filename="snyk-linux-arm64"
    elif [ "$os_type" == "linux" ] && [ "$arch_type" == "amd64" ]; then
        filename="snyk-linux"
        if [ -f "/lib/ld-musl-x86_64.so.1" ]; then
            filename="snyk-alpine"
        fi
    elif [ "$os_type" == "windows" ] && [ "$arch_type" == "amd64" ]; then
        filename="snyk-win"
        suffix=".exe"
    elif [ "$os_type" == "macos" ] && [ "$arch_type" == "amd64" ]; then
        filename="snyk-macos"
    elif [ "$os_type" == "macos" ] && [ "$arch_type" == "arm64" ]; then
        filename="snyk-macos-arm64"
    else
        echo "Unsupported platform. Aborting download."
        exit 1
    fi

    filename="$filename$suffix"
    output_filename="$output_filename$suffix"

    base_url="${2:-https://static.snyk.io}"
    download_version="$1"
    if [ "$download_version" != "latest" ] && [[ "$download_version" != v* ]]; then
        download_version="v$download_version"
    fi

    url="$base_url/cli/$download_version/$filename"
    response=$(curl -s -w "%{http_code}" -o "$filename" "$url")

    if [ "$response" == "200" ]; then
        sha_response=$(curl -s "$url.sha256" | awk '{print $1}')
        if [ -z "$sha_response" ]; then
            echo "SHA256 checksum not available. Aborting download."
            rm "$filename"
            exit 1
        fi

        downloaded_file_path="$filename"

        downloaded_checksum=$(sha256sum "$downloaded_file_path" | awk '{print $1}')

        if [ "$downloaded_checksum" == "$sha_response" ]; then
            mv "$downloaded_file_path" "$output_filename"
            echo "Snyk CLI $download_version downloaded successfully to $output_filename"
            chmod +x "$output_filename"
            ./"$output_filename" -v
            exit $success
        else
            rm "$downloaded_file_path"
            echo "SHA256 checksum verification failed. Downloaded file deleted."
            exit $fail
        fi
    else
        echo "Failed to download Snyk CLI $download_version"
        exit $fail
    fi
}

retry="${3:-3}"

for (( retry_count=1; retry_count <= retry; retry_count++ )); do
    echo "Trying to download version $1: #$retry_count of #$retry"
    download_snyk_cli "$1" "$2"
    ret_value=$?
    if [ "$ret_value" == "$success" ]; then
        break
    else
        sleep_time=$(( retry_count * 10 ))
        echo "Failed to download Snyk CLI. Retrying in $sleep_time seconds..."
        sleep "$sleep_time"
    fi
done
