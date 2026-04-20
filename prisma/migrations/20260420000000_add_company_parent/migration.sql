-- AlterTable
ALTER TABLE "companies" ADD COLUMN "parentCompanyId" TEXT;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_parentCompanyId_fkey" FOREIGN KEY ("parentCompanyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
