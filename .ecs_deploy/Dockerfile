ARG BASE_IMG_REPO=node:22.12.0-alpine

FROM ${BASE_IMG_REPO} AS base

RUN apk add --no-cache curl aws-cli

# Set working directory for all build stages.
WORKDIR /usr/src/app


# Copy the the source files into the image.
COPY . .

RUN npm ci

RUN chown -R node . \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

# Run the application as a non-root user.
USER node

# Expose the port that the application listens on.
EXPOSE 3333

ENTRYPOINT [ "docker-entrypoint.sh" ]

# Run the application.
CMD ["npm", "run", "start"]
