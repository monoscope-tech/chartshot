# Start from Bun's official image
FROM oven/bun:1.1.6

# Install necessary system dependencies for canvas
RUN apt-get update && apt-get install -y \
  build-essential \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  libgif-dev \
  librsvg2-dev \
  && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
COPY bun.lock ./
RUN bun install

# Copy the rest of your app source code
COPY . .

# Expose the port
EXPOSE 3001

# Start the server
CMD ["bun", "index.ts"]
