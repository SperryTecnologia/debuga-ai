ALTER TABLE `conversations` ADD `isPinned` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `isArchived` boolean DEFAULT false NOT NULL;