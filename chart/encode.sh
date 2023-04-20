#!/usr/bin/env bash

set -e
set -u

cd "$(dirname "${0}")"
cd output/project/
for dir in "${@}"; do
  ffmpeg -framerate 60 -pattern_type glob -i "${dir}/*.webp" -pix_fmt yuv420p -vcodec libx264 -qp 1 "${dir}.mp4"
  cp "$(printf '%s\n' "${dir}/"*.webp | sort | head -n1)" "${dir}.first.webp"
  cp "$(printf '%s\n' "${dir}/"*.webp | sort | tail -n1)" "${dir}.last.webp"
done
