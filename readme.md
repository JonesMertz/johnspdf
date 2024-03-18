This is 

# HTML to PDF api

This project creates an api for converting html to pdf files using node.js, express and puppeteer

## Table of Contents

- [HTML to PDF api](#html-to-pdf-api)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Usage](#usage)
  - [Features](#features)
  - [License](#license)

## Installation

1. Clone the repository: `git clone https://github.com/JonesMertz/johnspdf.git`
2. Install the dependencies: `npm install`
3. If running this on a linux machine more steps might be required.

## Usage

1. Run the project: `npm start`
2. Open your browser and navigate to `http://localhost:3005`

## Features

- Feature 1: Creates an express server on port 3005 for communication
- Feature 2: Runs several instances of headless chrome, which will be scaled up and down based on needs, that returns pdfs based on the provided html.

## License

This project is licensed under the [MIT License](LICENSE).