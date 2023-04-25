#!/usr/bin/env bash

set -e
set -u

cd "$(dirname "${0}")"
cd output/project/
for dir in "${@}"; do
  ffmpeg -y -framerate 60 -pattern_type glob -i "${dir}/*.webp" -pix_fmt yuv420p -vcodec libx264 -qp 1 "${dir}.mp4"
  convert "$(printf '%s\n' "${dir}/"*.webp | sort | head -n1)" "${dir}.first.png"
  convert "$(printf '%s\n' "${dir}/"*.webp | sort | tail -n1)" "${dir}.last.png"
done
