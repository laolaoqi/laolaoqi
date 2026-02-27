CREATE TABLE `sim_daily_pnl` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`initialCapital` float NOT NULL,
	`finalValue` float NOT NULL,
	`dailyPnl` float NOT NULL DEFAULT 0,
	`dailyPnlPercent` float NOT NULL DEFAULT 0,
	`positionCount` int NOT NULL DEFAULT 0,
	`strategy` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sim_daily_pnl_id` PRIMARY KEY(`id`)
);
