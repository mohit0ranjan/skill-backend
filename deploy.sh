#!/bin/bash

echo "Installing backend dependencies..."
npm install --production --no-scripts

echo "Generating Prisma client..."
npm run build

echo "Starting SkillBridge backend API..."
npm start
