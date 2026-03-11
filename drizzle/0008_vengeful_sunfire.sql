CREATE TABLE `sim_ashare_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`initialCapital` float NOT NULL DEFAULT 1000000,
	`startDate` timestamp NOT NULL DEFAULT (now()),
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sim_ashare_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sim_ashare_portfolio` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`name` varchar(100) NOT NULL,
	`category` varchar(20) NOT NULL,
	`industry` varchar(50),
	`entryPrice` float NOT NULL,
	`currentPrice` float NOT NULL,
	`quantity` int NOT NULL,
	`costBasis` float NOT NULL,
	`currentValue` float NOT NULL,
	`pnl` float NOT NULL DEFAULT 0,
	`pnlPercent` float NOT NULL DEFAULT 0,
	`weight` float NOT NULL DEFAULT 0,
	`score` float DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sim_ashare_portfolio_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sim_ashare_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`totalValue` float NOT NULL,
	`cashBalance` float NOT NULL,
	`investedValue` float NOT NULL,
	`totalPnl` float NOT NULL DEFAULT 0,
	`totalPnlPercent` float NOT NULL DEFAULT 0,
	`positionCount` int NOT NULL DEFAULT 0,
	`strategy` varchar(50),
	`snapshotTime` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sim_ashare_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sim_ashare_trades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`name` varchar(100) NOT NULL,
	`action` varchar(10) NOT NULL,
	`price` float NOT NULL,
	`quantity` int NOT NULL,
	`value` float NOT NULL,
	`reason` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sim_ashare_trades_id` PRIMARY KEY(`id`)
);
