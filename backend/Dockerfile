# Use a minimal base image that supports both Node and can download Lean 4 easily
FROM node:18-bullseye-slim

# Install dependencies needed for Elan and Mathlib
RUN apt-get update && \
    apt-get install -y curl ca-certificates git libgmp-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Elan and Lean 4 stable
ENV ELAN_HOME=/usr/local/elan
ENV PATH="${ELAN_HOME}/bin:${PATH}"
RUN curl https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh -sSf | sh -s -- -y --default-toolchain none

# Create app directory
WORKDIR /usr/src/app

# 1. Pin toolchain and install it (Cachable)
COPY lean-toolchain ./
RUN elan toolchain install $(cat lean-toolchain)

# 2. Copy Lake configuration and library source (Cachable)
COPY lakefile.lean MathProofs.lean ./
RUN lake update && lake exe cache get && lake build

# 3. Install Node.js dependencies (Cachable independently of Lean and app code)
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Make entrypoint executable
RUN chmod +x /usr/src/app/entrypoint.sh

# Expose port
EXPOSE 3000

# Start command via entrypoint (auto-creates DB file if missing)
CMD [ "/bin/sh", "/usr/src/app/entrypoint.sh" ]
