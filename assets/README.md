# Application Icons

This directory contains the application icons for jhl-github-desktop.

## Icon Design

The icon features:
- GitHub dark theme background (#24292f)
- GitHub Actions teal color (#2aa198) for the gear
- Play button symbolizing workflow runs
- "JHL" branding

## Building Icons

To build proper icon files for all platforms:

### For Development
The SVG icon is used as a reference. For production builds, convert to:

1. **Windows (.ico)**: Use online converter or imagemagick
   ```bash
   convert icon.svg -resize 256x256 icon.ico
   ```

2. **macOS (.icns)**: Create iconset and convert
   ```bash
   mkdir icon.iconset
   sips -z 16 16     icon.svg --out icon.iconset/icon_16x16.png
   sips -z 32 32     icon.svg --out icon.iconset/icon_16x16@2x.png
   sips -z 32 32     icon.svg --out icon.iconset/icon_32x32.png
   sips -z 64 64     icon.svg --out icon.iconset/icon_32x32@2x.png
   sips -z 128 128   icon.svg --out icon.iconset/icon_128x128.png
   sips -z 256 256   icon.svg --out icon.iconset/icon_128x128@2x.png
   sips -z 256 256   icon.svg --out icon.iconset/icon_256x256.png
   sips -z 512 512   icon.svg --out icon.iconset/icon_256x256@2x.png
   sips -z 512 512   icon.svg --out icon.iconset/icon_512x512.png
   sips -z 1024 1024 icon.svg --out icon.iconset/icon_512x512@2x.png
   iconutil -c icns icon.iconset
   ```

3. **Linux (.png)**: Standard PNG sizes
   ```bash
   convert icon.svg -resize 512x512 icon.png
   ```

## Credits

Icon designed for jhl-github-desktop
Author: JHL (declue)
