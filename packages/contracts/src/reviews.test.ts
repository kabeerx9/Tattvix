import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reviewInputSchema, guestReviewStateSchema, hotelReviewsSchema } from './reviews';
test('review requires integer 1–5 stars and nonempty trimmed text, without writable identities',()=>{
  assert.deepEqual(reviewInputSchema.parse({rating:5,comment:'  Excellent.  '}),{rating:5,comment:'Excellent.'});
  for(const input of [{rating:0,comment:'x'},{rating:6,comment:'x'},{rating:2.5,comment:'x'},{rating:true,comment:'x'},{rating:5,comment:' '},{rating:5,comment:'x'.repeat(2001)},{rating:5,comment:'x',stayId:'other'}]) assert.equal(reviewInputSchema.safeParse(input).success,false);
});
test('unreviewed stay and empty property summary are valid',()=>{
  assert.deepEqual(guestReviewStateSchema.parse({review:null,canReview:true}),{review:null,canReview:true});
  assert.equal(hotelReviewsSchema.safeParse({reviews:[],pageSize:25,hasMore:false,nextCursor:null,summary:{totalReviews:0,averageRating:null}}).success,true);
});
