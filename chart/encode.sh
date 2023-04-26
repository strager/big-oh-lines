#!/usr/bin/env bash

set -e
set -u

cd "$(dirname "${0}")"
cd output/project/
for dir in "${@}"; do
  temp_dir="$(mktemp -d)"

  first_frame="$(printf '%s\n' "${dir}/"*.webp | sort | head -n1)"
  last_frame="$(printf '%s\n' "${dir}/"*.webp | sort | tail -n1)"

  for file in "${dir}/"*.webp; do
    ln -s "${PWD}/${file}" "${temp_dir}/$(basename "${file}")"
  done

  last_frame_number="$(basename "${last_frame}" .webp)"
  for i in {1..5}; do
    # HACK(strager): Duplicate the last frame a few times to work around
    # PowerPoint sometimes not showing the last frame.
    new_frame_file_name="$(printf '%06d.webp' $((10#$last_frame_number + $i)))"
    ln -s "${PWD}/${last_frame}" "${temp_dir}/${new_frame_file_name}"
  done

  ffmpeg \
      -y \
      -framerate 60 \
      -pattern_type sequence \
      -i "${temp_dir}/%06d.webp" \
      -pix_fmt yuv420p \
      -vcodec libx264 \
      -qp 1 \
      "${dir}.mp4"
  convert "${first_frame}" "${dir}.first.png"
  convert "${last_frame}" "${dir}.last.png"

  rm -rf "${temp_dir}"
done
