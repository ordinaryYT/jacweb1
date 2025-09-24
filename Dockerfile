# Use Nginx (pinned version, alpine-based)
FROM nginx:1.25-alpine

# Set working directory inside container
WORKDIR /usr/share/nginx/html

# Remove default nginx files
RUN rm -rf ./*

# Copy your static site files
COPY index.html ./

# Copy custom nginx.conf to support $PORT
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port (Render will map this automatically)
EXPOSE 10000

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
