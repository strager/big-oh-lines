#!/usr/bin/env bash

set -e
set -u

dir="${1}"

cd "$(dirname "${0}")"
cd output/project/
ffmpeg -framerate 60 -pattern_type glob -i "${dir}/*.webp" -pix_fmt yuv420p -vcodec libx264 -qp 1 "${dir}.mp4"
