import { create } from "zustand";
import { persist } from "zustand/middleware";
import { scopedJsonStorage } from "@/lib/storage/scoped";
import type { MonthlyReviewDto, QuarterlyReviewDto } from "@/lib/reviews/schema";

type ReviewsState = {
  monthly: MonthlyReviewDto[];
  quarterly: QuarterlyReviewDto[];
  upsertMonthly: (review: MonthlyReviewDto) => void;
  upsertQuarterly: (review: QuarterlyReviewDto) => void;
};

export const useReviewsStore = create<ReviewsState>()(
  persist(
    (set) => ({
      monthly: [],
      quarterly: [],
      upsertMonthly: (review) =>
        set((state) => {
          const exists = state.monthly.some(
            (item) => item.year === review.year && item.month === review.month,
          );
          return {
            monthly: exists
              ? state.monthly.map((item) =>
                  item.year === review.year && item.month === review.month
                    ? review
                    : item,
                )
              : [...state.monthly, review],
          };
        }),
      upsertQuarterly: (review) =>
        set((state) => {
          const exists = state.quarterly.some(
            (item) => item.year === review.year && item.quarter === review.quarter,
          );
          return {
            quarterly: exists
              ? state.quarterly.map((item) =>
                  item.year === review.year && item.quarter === review.quarter
                    ? review
                    : item,
                )
              : [...state.quarterly, review],
          };
        }),
    }),
    { name: "jr-reviews", storage: scopedJsonStorage },
  ),
);
