#!/bin/bash

# Icon Generation Script
# This script generates all application icons from icon.svg
# Usage: ./generate-icons.sh

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ICON_SVG="$SCRIPT_DIR/icon.svg"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Icon Generation Script ===${NC}"

# Check if icon.svg exists
if [ ! -f "$ICON_SVG" ]; then
    echo -e "${RED}Error: icon.svg not found at $ICON_SVG${NC}"
    exit 1
fi

# Check if ImageMagick is installed
if ! command -v magick &> /dev/null; then
    echo -e "${RED}Error: ImageMagick is not installed. Please install it first.${NC}"
    echo "On Ubuntu/Debian: sudo apt install imagemagick"
    echo "On macOS: brew install imagemagick"
    exit 1
fi


echo -e "${YELLOW}Step 1: Creating assets directory...${NC}"
mkdir -p "$SCRIPT_DIR/assets"

echo -e "${YELLOW}Step 2: Converting icon.svg to 1024x1024 PNG for Capacitor...${NC}"
magick "$ICON_SVG" -background none -resize 1024x1024 "$SCRIPT_DIR/assets/icon.png"
echo -e "${GREEN}✓ Created assets/icon.png${NC}"

echo -e "${YELLOW}Step 3: Generating Android icons with @capacitor/assets...${NC}"
cd "$SCRIPT_DIR"

# Check if @capacitor/assets is installed
if ! npm list @capacitor/assets &> /dev/null; then
    echo -e "${YELLOW}@capacitor/assets not found, installing...${NC}"
    npm install @capacitor/assets --save-dev
fi

npx capacitor-assets generate --android
echo -e "${GREEN}✓ Generated Android icons and splash screens${NC}"

echo -e "${YELLOW}Step 4: Creating favicons...${NC}"
mkdir -p "$SCRIPT_DIR/public"
cp "$ICON_SVG" "$SCRIPT_DIR/public/icon.svg"
magick "$ICON_SVG" -background none -resize 32x32 "$SCRIPT_DIR/public/favicon.ico"
echo -e "${GREEN}✓ Created public/icon.svg${NC}"
echo -e "${GREEN}✓ Created public/favicon.ico${NC}"

echo ""
echo -e "${GREEN}=== Icon generation complete! ===${NC}"
echo ""
echo "Generated assets:"
echo "  - Favicon (SVG + ICO)"
echo "  - Android app icons (all densities)"
echo "  - Android splash screens (all orientations and densities)"
echo ""
echo -e "${YELLOW}Note: If you've updated index.html to reference /icon.svg, no further changes needed.${NC}"
echo -e "${YELLOW}To apply Android changes, run: npx cap sync android${NC}"
