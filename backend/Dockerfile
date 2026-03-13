# Use a minimal base image that supports both Node and can download Lean 4 easily
FROM node:18-bullseye-slim

# Install dependencies needed for Elan (Lean version manager)
RUN apt-get update && \
    apt-get install -y curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Install Elan and Lean 4 nightly (or stable)
ENV ELAN_HOME=/usr/local/elan
ENV PATH="${ELAN_HOME}/bin:${PATH}"
RUN curl https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh -sSf | sh -s -- -y --default-toolchain leanprover/lean4:nightly

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
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
