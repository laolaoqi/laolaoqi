CREATE TABLE `market_sentiment_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`market` varchar(20) NOT NULL,
	`advanceRatio` float DEFAULT 50,
	`mainForceFlow` float DEFAULT 0,
	`marketState` varchar(20) DEFAULT 'neutral',
	`stopLoss` float,
	`positionSuggestion` float,
	`advice` text,
	`batchId` varchar(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `market_sentiment_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`market` varchar(20) NOT NULL,
	`rank` int NOT NULL,
	`code` varchar(20) NOT NULL,
	`symbol` varchar(30) NOT NULL,
	`nameZh` varchar(100) NOT NULL,
	`nameEn` varchar(100) NOT NULL,
	`industry` varchar(50),
	`price` float NOT NULL DEFAULT 0,
	`priceChange` float NOT NULL DEFAULT 0,
	`changePercent` float NOT NULL DEFAULT 0,
	`score` float NOT NULL DEFAULT 0,
	`signal` varchar(20) NOT NULL DEFAULT 'hold',
	`pe` float,
	`pb` float,
	`dividendYield` float,
	`capitalFlow` float DEFAULT 0,
	`reason` text,
	`reasonDetail` text,
	`tags` varchar(500),
	`batchId` varchar(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_recommendations_id` PRIMARY KEY(`id`)
);
