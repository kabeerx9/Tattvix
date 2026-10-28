import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QueryClient } from '@tanstack/react-query';
import { ApiError, createApiClient } from '@tattvix/contracts';
import { createReviewsApi, createReviewQueries, reviewKeys, submitReviewMutation } from './reviews';
const state={review:{id:1,rating:5,comment:'Great.',createdAt:'2026-10-28T00:00:00Z'},canReview:false};
test('review write uses only stars/text and scopes by guest-owned stay',async()=>{
 const api=createReviewsApi(createApiClient({baseUrl:'https://example.test',getToken:async()=>null,fetchImpl:async(url,init)=>{
  assert.equal(String(url),'https://example.test/api/guest/stays/visit%2Fone/review/');
  assert.equal(init?.method,'POST');assert.deepEqual(JSON.parse(String(init?.body)),{rating:5,comment:'Great.'});return Response.json(state);
 }}));
 assert.deepEqual(await api.submit('visit/one',{rating:5,comment:'  Great.  '}),state);
});
test('review query keys isolate stays, properties and pages',()=>{
 const api=createReviewsApi(createApiClient({baseUrl:'https://example.test',getToken:async()=>null}));
 const queries=createReviewQueries(api);
 assert.notDeepEqual(queries.guest('one').queryKey,queries.guest('two').queryKey);
 assert.notDeepEqual(queries.hotel('a','x',1).queryKey,queries.hotel('a','y',1).queryKey);
 assert.notDeepEqual(queries.hotel('a','x',1).queryKey,queries.hotel('a','x',2).queryKey);
});
test('successful submission caches immutable result; conflicting submit invalidates guest state',async()=>{
 const api=createReviewsApi(createApiClient({baseUrl:'https://example.test',getToken:async()=>null}));
 const client=new QueryClient();
 const mutation=submitReviewMutation(api,client,'visit');
 await mutation.onSuccess(state);
 assert.deepEqual(client.getQueryData(reviewKeys.guest('visit')),state);
 await mutation.onError(new ApiError(409,'Already submitted'));
 assert.equal(client.getQueryState(reviewKeys.guest('visit'))?.isInvalidated,true);
});
