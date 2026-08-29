-- AlterTable
ALTER TABLE "DailyTodo" ADD COLUMN     "carriedFromDate" DATE,
ADD COLUMN     "incompleteReason" TEXT,
ADD COLUMN     "postponedToDates" JSONB,
ADD COLUMN     "sourceTodoId" UUID;

-- AddForeignKey
ALTER TABLE "DailyTodo" ADD CONSTRAINT "DailyTodo_sourceTodoId_fkey" FOREIGN KEY ("sourceTodoId") REFERENCES "DailyTodo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
