import { Request, Response } from 'express';
import { z } from 'zod';
import { Review } from '../models/Review';
import { Station } from '../models/Station';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

const addReviewSchema = z.object({
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  comment: z.string().min(1, 'Comment is required'),
});

export const getStationReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stationId } = req.params;
    const reviews = await Review.find({ stationId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: reviews });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { stationId } = req.params;
    const parseResult = addReviewSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.format(),
      });
      return;
    }

    const { rating, comment } = parseResult.data;

    const station = await Station.findById(stationId);
    if (!station) {
      res.status(404).json({ success: false, message: 'Station not found' });
      return;
    }

    const review = new Review({
      stationId,
      userId: req.user.id,
      userName: req.user.name,
      rating,
      comment,
    });

    await review.save();

    // Recalculate average rating
    const reviews = await Review.find({ stationId });
    const totalReviews = reviews.length;
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    station.totalReviews = totalReviews;
    station.rating = Math.round(avgRating * 10) / 10;
    await station.save();

    res.status(201).json({ success: true, data: review });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);

    if (!review) {
      res.status(404).json({ success: false, message: 'Review not found' });
      return;
    }

    // Only author can delete
    if (!req.user || req.user.id !== review.userId.toString()) {
      res.status(403).json({ success: false, message: 'Forbidden, you can only delete your own reviews' });
      return;
    }

    const stationId = review.stationId;
    await review.deleteOne();

    // Recalculate average rating
    const reviews = await Review.find({ stationId });
    const station = await Station.findById(stationId);

    if (station) {
      const totalReviews = reviews.length;
      const avgRating = totalReviews > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0;
      station.totalReviews = totalReviews;
      station.rating = Math.round(avgRating * 10) / 10;
      await station.save();
    }

    res.status(200).json({ success: true, message: 'Review deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
