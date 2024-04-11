FROM golang:1.20-alpine3.17 AS builder

WORKDIR $GOPATH/src/github.com/asty-org/asty

COPY ./asty .

RUN go clean -modcache && \
    apk add --no-cache alpine-sdk git make

RUN make
RUN cp bin/asty /


# Fetching the minified node image on apline linux
FROM node:alpine

# Declaring env
ENV NODE_ENV development

# Setting up the work directory
WORKDIR /app

# Copying all the files in our project
COPY . .


RUN rm -r asty

COPY --from=builder /asty bin/asty
RUN chmod +x bin/asty

RUN chmod 777 -R temp

# Installing dependencies
RUN npm install

# Starting our application
CMD [ "node", "server.js" ]

# Exposing server port
EXPOSE 3000