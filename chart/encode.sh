#!/usr/bin/env bash

set -e
set -u

dir="${1}"

cd "$(dirname "${0}")"
cd output/project/
ffmpeg -framerate 60 -pattern_type glob -i "${dir}/*.webp" -vcodec libx264 -qp 0 "${dir}.mp4"
