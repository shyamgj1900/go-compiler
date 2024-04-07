# Project Name

Virtual machine for Golang

## Description

A built-in compiler which compiles the given Go code into a set of virtual machine instructions. The compiler and
the VM instruction set interpreter are both written in Javascript. A web based UI gives users the ability to write
their Go code and an output console displays the results.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Installation

### Note: Make sure to have Docker installed locally

### Frontend

- Go into the frontend directory.
  `cd frontend`
- To build the image for the frontend.
  `docker build -t <your-image-name>-web:latest .`

### Server

- Go into the server directory.
  `cd ../server`
- To build the image for the server
  `docker build -t <your-image-name>-app:latest .`

### Run

- Go into the docker directory.
  `cd ../docker`
- To run the docker containers.
  `docker-compose up`

## Usage

To access the web UI, go to a browser of your choice and access http://localhost:4200

## Contributing

Guidelines for contributing to the project and how to submit pull requests.

## License

This project is licensed under the [MIT License](LICENSE).

## Contact

- Your Name: [Your Name](mailto:your-email@example.com)
- Project Link: [Project Name](https://github.com/your-username/project-name)
