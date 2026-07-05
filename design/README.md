# Icon

`icon-1024.png` is the master source. Regenerate the platform icons with:

```sh
# from repo root — recreate the master (indigo tile + bold "a")
magick -size 1024x1024 xc:none \
  -fill '#6c6cff' -draw 'roundrectangle 0,0 1023,1023 224,224' \
  -font '/System/Library/Fonts/Supplemental/Arial Bold.ttf' -pointsize 760 \
  -fill white -gravity center -annotate +0+30 'a' \
  design/icon-1024.png

# then fan out to icns/ico/pngs
cd app && npm run tauri -- icon ../design/icon-1024.png
# (delete the generated android/ and ios/ dirs — desktop-only)
```
