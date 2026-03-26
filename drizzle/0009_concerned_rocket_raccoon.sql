CREATE TABLE `sim_ashare_weekly` (
	`id` int AUTO_INCREMENT NOT NULL,
	`weekLabel` varchar(20) NOT NULL,
	`weekStartDate` varchar(10) NOT NULL,
	`weekEndDate` varchar(10) NOT NULL,
	`startValue` float NOT NULL,
	`endValue` float,
	`weeklyPnl` float,
	`weeklyPnlPercent` float,
	`startCash` float NOT NULL,
	`endCash` float,
	`startPositionCount` int NOT NULL DEFAULT 0,
	`endPositionCount` int,
	`strategy` varchar(50),
	`isComplete` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sim_ashare_weekly_id` PRIMARY KEY(`id`)
);
