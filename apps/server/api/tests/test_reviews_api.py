from datetime import timedelta
from types import SimpleNamespace
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from api.models import ClerkUser, Organization, Property, Membership, MembershipRole, HotelQrToken, Stay, SharedIdentitySnapshot, OperationalStayStatus, StayStatus, Subscription

class ReviewFixtures:
    def setUp(self):
        self.guest = ClerkUser.objects.create(clerk_id='review-guest', first_name='Guest', last_name='Tester')
        self.owner = ClerkUser.objects.create(clerk_id='review-owner')
        self.other = ClerkUser.objects.create(clerk_id='review-other')
        self.org = Organization.objects.create(name='Reviews', slug='reviews')
        self.property = Property.objects.create(organization=self.org, name='Hotel', slug='hotel')
        self.other_property = Property.objects.create(organization=self.org, name='Other', slug='other')
        self.membership = Membership.objects.create(user=self.owner, organization=self.org, role=MembershipRole.OWNER, has_all_properties=True)
        self.qr = HotelQrToken.objects.create(property=self.property, token_digest='r'*64, token_hint='reviews', created_by=self.owner, expires_at=timezone.now()+timedelta(days=10))
        self.stay = self.make_stay()
        self.auth(self.guest)
    def auth(self,user):
        self.client.force_authenticate(user=SimpleNamespace(is_authenticated=True, db_user=user))
    def make_stay(self, **overrides):
        values=dict(property=self.property, qr_token=self.qr, guest=self.guest, status=StayStatus.CLOSED, operational_status=OperationalStayStatus.CHECKED_OUT, submitted_at=timezone.now()-timedelta(days=3), checked_in_at=timezone.now()-timedelta(days=2), checked_out_at=timezone.now()-timedelta(days=1))
        values.update(overrides)
        stay=Stay.objects.create(**values)
        SharedIdentitySnapshot.objects.create(stay=stay, guest_data={'legalFirstName':'Guest','legalLastName':'Tester'}, document_data={}, companion_data=[])
        return stay
    def url(self,stay=None):
        return reverse('guest-stay-review',args=[(stay or self.stay).public_id])
    def hotel_url(self,property_=None):
        return reverse('hotel-reviews', args=[self.org.slug,(property_ or self.property).slug])
    def submit(self, **kwargs):
        return self.client.post(self.url(), {'rating':4,'comment':'A lovely stay.',**kwargs}, format='json')

class ReviewApiTests(ReviewFixtures, APITestCase):
    def test_guest_submits_immutable_review_and_retry_is_idempotent(self):
        state=self.client.get(self.url())
        self.assertEqual(state.status_code,200)
        self.assertTrue(state.data['canReview'])
        self.assertIsNone(state.data['review'])
        first=self.submit(comment='  A lovely stay.  ')
        self.assertEqual(first.status_code,201)
        self.assertEqual(first.data['review']['comment'],'A lovely stay.')
        self.assertFalse(first.data['canReview'])
        retry=self.submit()
        self.assertEqual(retry.status_code,200)
        self.assertEqual(retry.data,first.data)
        self.assertEqual(self.submit(rating=1).status_code,409)
        self.assertEqual(self.client.patch(self.url(), {'rating':2},format='json').status_code,405)
        self.assertEqual(self.client.delete(self.url()).status_code,405)
        self.assertEqual(self.client.get(self.url()).data,first.data)
    def test_each_visit_can_have_its_own_review(self):
        self.assertEqual(self.submit().status_code,201)
        second=self.make_stay()
        self.assertEqual(self.client.post(self.url(second),{'rating':2,'comment':'Second visit.'},format='json').status_code,201)
        self.auth(self.owner)
        data=self.client.get(self.hotel_url()).data
        self.assertEqual(data['summary'], {'totalReviews':2,'averageRating':3.0})
    def test_only_stay_guest_can_read_or_submit_and_anonymous_denied(self):
        for user in [self.owner,self.other]:
            self.auth(user)
            self.assertEqual(self.client.get(self.url()).status_code,404)
            self.assertEqual(self.submit().status_code,404)
        self.client.force_authenticate(user=None)
        self.assertIn(self.client.get(self.url()).status_code,[401,403])
    def test_only_actual_checkout_allows_review(self):
        for state in [OperationalStayStatus.PENDING_CHECK_IN,OperationalStayStatus.CHECKED_IN]:
            self.stay.operational_status=state;self.stay.save()
            self.assertFalse(self.client.get(self.url()).data['canReview'])
            self.assertEqual(self.submit().status_code,409)
        self.stay.operational_status=OperationalStayStatus.CHECKED_OUT
        self.stay.checked_out_at=None;self.stay.save()
        self.assertEqual(self.submit().status_code,409)
    def test_revoked_or_expired_identity_does_not_prevent_review(self):
        self.stay.status=StayStatus.REVOKED
        self.stay.hotel_access_expires_at=timezone.now()-timedelta(days=100)
        self.stay.save()
        self.assertEqual(self.submit().status_code,201)
    def test_invalid_stars_text_and_unknown_fields_are_rejected(self):
        for payload in [{'rating':0},{'rating':6},{'rating':3.5},{'rating':True},{'comment':''},{'comment':'  '},{'comment':'x'*2001},{'guestId':self.other.id}]:
            self.assertEqual(self.submit(**payload).status_code,400,payload)
        self.assertIsNone(self.client.get(self.url()).data['review'])
    def test_owner_list_is_private_property_scoped_and_links_to_stay(self):
        self.submit()
        for role in [MembershipRole.MANAGER,MembershipRole.RECEPTION]:
            self.membership.role=role;self.membership.save()
            self.auth(self.owner)
            self.assertEqual(self.client.get(self.hotel_url()).status_code,404)
        self.membership.role=MembershipRole.OWNER;self.membership.save()
        self.auth(self.guest)
        self.assertEqual(self.client.get(self.hotel_url()).status_code,404)
        self.auth(self.owner)
        data=self.client.get(self.hotel_url()).data
        self.assertEqual(data['reviews'][0]['stayId'],str(self.stay.public_id))
        self.assertEqual(data['reviews'][0]['guestName'],'Guest Tester')
        self.assertNotIn('document',str(data).lower())
        self.assertEqual(self.client.get(self.hotel_url(self.other_property)).data['summary']['totalReviews'],0)
        self.assertEqual(self.client.get(self.hotel_url()+'?before=0').status_code,400)
    def test_reviews_remain_readable_after_subscription_expiry(self):
        self.submit()
        Subscription.objects.filter(organization=self.org).update(trial_ends_at=timezone.now()-timedelta(days=1),paid_until=None)
        self.auth(self.owner)
        self.assertEqual(self.client.get(self.hotel_url()).status_code,200)
    def test_pagination_is_bounded_and_summary_covers_all_reviews(self):
        for _ in range(26):
            self.stay=self.make_stay();self.assertEqual(self.submit(rating=5).status_code,201)
        self.auth(self.owner)
        first=self.client.get(self.hotel_url()).data
        # A new arrival between pages must not duplicate or skip older reviews.
        self.auth(self.guest)
        self.stay=self.make_stay();self.assertEqual(self.submit(rating=1).status_code,201)
        self.auth(self.owner)
        second=self.client.get(self.hotel_url()+'?before='+str(first['nextCursor'])).data
        self.assertEqual(len(first['reviews']),25)
        self.assertTrue(first['hasMore'])
        self.assertEqual(len(second['reviews']),1)
        self.assertFalse(second['hasMore'])
        self.assertEqual(first['summary'],{'totalReviews':26,'averageRating':5.0})
        self.assertNotEqual(first['reviews'][0]['id'],second['reviews'][0]['id'])

    def test_other_organizations_and_unassigned_properties_are_not_visible(self):
        from api.models import MembershipPropertyAccess
        self.submit()
        self.auth(self.owner)
        other_org=Organization.objects.create(name='Private',slug='private')
        other_property=Property.objects.create(organization=other_org,name='Private hotel',slug='hotel')
        self.assertEqual(self.client.get(reverse('hotel-reviews',args=[other_org.slug,other_property.slug])).status_code,404)
        self.membership.has_all_properties=False;self.membership.save()
        MembershipPropertyAccess.objects.create(membership=self.membership,property=self.other_property)
        self.assertEqual(self.client.get(self.hotel_url()).status_code,404)

    def test_database_enforces_stay_uniqueness_and_rating_range(self):
        from django.db import IntegrityError, transaction
        from api.models import StayReview
        with self.assertRaises(IntegrityError),transaction.atomic():
            StayReview.objects.create(stay=self.stay,rating=0,comment='Invalid')
        self.assertEqual(self.submit().status_code,201)
        with self.assertRaises(IntegrityError),transaction.atomic():
            StayReview.objects.create(stay=self.stay,rating=5,comment='Duplicate')

    def test_owner_list_uses_bounded_queries_without_loading_identity_documents(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        self.submit()
        self.auth(self.owner)
        with CaptureQueriesContext(connection) as queries:
            response=self.client.get(self.hotel_url())
        self.assertEqual(response.status_code,200)
        self.assertLessEqual(len(queries),5)
        for query in queries:
            self.assertNotIn('document_data',query['sql'])
            self.assertNotIn('object_key',query['sql'])
            self.assertNotIn('OFFSET',query['sql'])
        self.assertEqual(self.client.get(self.hotel_url()+'?page=1000000').status_code,400)
        self.assertEqual(self.client.get(self.hotel_url()+'?before=9007199254740991').status_code,200)

from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from django.db import connections
from rest_framework.test import APITransactionTestCase, APIClient

class ReviewConcurrencyTests(ReviewFixtures, APITransactionTestCase):
    def concurrent_submit(self, ratings):
        gate=Barrier(2)
        def submit(rating):
            try:
                client=APIClient()
                client.force_authenticate(user=SimpleNamespace(is_authenticated=True, db_user=self.guest))
                gate.wait(timeout=5)
                return client.post(self.url(),{'rating':rating,'comment':'Concurrent review'},format='json').status_code
            finally:
                connections.close_all()
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures=[pool.submit(submit,rating) for rating in ratings]
            return sorted(f.result(timeout=10) for f in futures)
    def test_same_submission_race_records_one_review(self):
        from api.models import StayReview
        self.assertEqual(self.concurrent_submit([5,5]),[200,201])
        self.assertEqual(StayReview.objects.filter(stay=self.stay).count(),1)
    def test_different_submission_race_cannot_overwrite_first_review(self):
        from api.models import StayReview
        self.assertEqual(self.concurrent_submit([1,5]),[201,409])
        self.assertEqual(StayReview.objects.filter(stay=self.stay).count(),1)
