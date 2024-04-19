# Project

Virtual machine for Golang

## Description

A built-in compiler which compiles the given Go code into a set of virtual machine instructions. The compiler and
the VM instruction set interpreter are both written in Javascript. A web based UI gives users the ability to write
their Go code and an output console displays the results.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Contact](#contact)

## Installation

### Note: Make sure to have Docker installed locally

- Go into the root directory go-virtual-machine
  `cd go-virtual-machine`

### Frontend

- Go into the frontend directory.
  `cd frontend`
- To build the image for the frontend.
  `docker build -t govirtualmachine-web:latest .`

### Server

- Go into the server directory.
  `cd ../server`
- To build the image for the server
  `docker build -t govirtualmachine-app:latest .`

### Run

- Go into the docker directory.
  `cd ../docker`
- To run the docker containers.
  `docker-compose up`

### Test cases

- Test cases are present in the test directory. Copy the code from the files and run it on the web UI.
  `cd test`
- Sequential PL tests are in the sequential directory and concurrent PL tests are in the concurrent directory.

## Usage

To access the web UI, go to a browser of your choice and access http://localhost:4200

## Contact

- Name: [Shyam Ganesh](mailto:e0544484@u.nus.edu)
- Project Link: [Go virtual machine](https://github.com/shyamgj1900/go-virtual-machine/tree/master)
