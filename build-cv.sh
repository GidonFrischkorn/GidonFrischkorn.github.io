#!/bin/bash
# Build all CV PDFs and the website
# Run from the repository root

set -e

echo "Building website..."
quarto render

echo "Building CV PDFs..."
cd cv
quarto render
cd ..

echo "Done. Site at _site/, CV PDFs at _site/cv/"
