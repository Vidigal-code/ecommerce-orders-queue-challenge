# E-commerce Orders Queue Challenge

This project simulates an e-commerce platform that generates and processes 1 million orders using a scalable NoSQL database and a queueing system. The application is built with NestJS for the backend and React for the frontend.

## Features

- **Order Generation**: Generates 1 million orders with randomly populated fields including ID, customer, amount, tier (BRONZE, SILVER, GOLD, DIAMOND), and observations.
- **Queued Order Processing**: Utilizes BullMQ for processing orders in batches, prioritizing VIP (DIAMOND) orders.
- **Logging**: Detailed logs of order generation and processing times, including metrics for both VIP and normal orders.
- **API Endpoint**: A single GET `/orders` endpoint that returns detailed information about processed orders.
- **Real-time Updates**: Uses WebSocket for real-time data updates on the frontend.
- **Scalability**: Designed to handle large volumes of data efficiently.
- **Reset Functionality**: Allows for database reset to rerun tests without interference.

## Project Structure

```
ecommerce-orders-queue-challenge
├── nest-backend
│   ├── src
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   └── .env
├── react-frontend
│   ├── src
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── index.html
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

- Node.js
- MongoDB
- Redis
- Docker (optional)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd ecommerce-orders-queue-challenge
   ```

2. Navigate to the backend directory and install dependencies:
   ```
   cd nest-backend
   npm install
   ```

3. Navigate to the frontend directory and install dependencies:
   ```
   cd ../react-frontend
   npm install
   ```

### Running the Application

1. Start the backend server:
   ```
   cd nest-backend
   npm run start
   ```

2. Start the frontend application:
   ```
   cd ../react-frontend
   npm run dev
   ```

3. Access the application at `http://localhost:3000`.

### Docker

To run the application using Docker, use the following command:
```
docker-compose up
```

## API Documentation

### GET /orders

Returns information about processed orders, including:

- Order generation time
- Processing and saving time, separated by priority
- Processing start and end times for each priority type
- Total process execution time
- Number of orders processed for each type (VIP and normal)

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License.