-- CreateTable
CREATE TABLE "Source" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'rss',
    "category" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" SERIAL NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "attentionScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "topicId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "clusteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Summary" (
    "id" SERIAL NOT NULL,
    "topicId" INTEGER NOT NULL,
    "japaneseSummary" TEXT NOT NULL,
    "whyHot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftPost" (
    "id" SERIAL NOT NULL,
    "summaryId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "posted" BOOLEAN NOT NULL DEFAULT false,
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DraftPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Source_url_key" ON "Source"("url");

-- CreateIndex
CREATE UNIQUE INDEX "Item_url_key" ON "Item"("url");

-- CreateIndex
CREATE INDEX "Item_sourceId_idx" ON "Item"("sourceId");

-- CreateIndex
CREATE INDEX "Item_topicId_idx" ON "Item"("topicId");

-- CreateIndex
CREATE INDEX "Item_publishedAt_idx" ON "Item"("publishedAt");

-- CreateIndex
CREATE INDEX "Item_attentionScore_idx" ON "Item"("attentionScore");

-- CreateIndex
CREATE INDEX "Summary_topicId_idx" ON "Summary"("topicId");

-- CreateIndex
CREATE INDEX "DraftPost_summaryId_idx" ON "DraftPost"("summaryId");

-- CreateIndex
CREATE INDEX "DraftPost_posted_idx" ON "DraftPost"("posted");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Summary" ADD CONSTRAINT "Summary_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPost" ADD CONSTRAINT "DraftPost_summaryId_fkey" FOREIGN KEY ("summaryId") REFERENCES "Summary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
