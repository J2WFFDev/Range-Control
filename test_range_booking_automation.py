"""
Unit tests for RangeBookingAutomation system
"""

import pytest
from datetime import datetime, timedelta
from range_booking_automation import (
    RangeBookingAutomation,
    Booking,
    BookingStatus,
    Resource,
    User,
    UserRole,
    ActionType
)


@pytest.fixture
def system():
    """Create a fresh automation system"""
    return RangeBookingAutomation()


@pytest.fixture
def bay1():
    """Create a bay resource"""
    return Resource(id="bay-1", name="Bay 1", resource_type="bay")


@pytest.fixture
def bay2():
    """Create another bay resource"""
    return Resource(id="bay-2", name="Bay 2", resource_type="bay")


@pytest.fixture
def staff_user():
    """Create a staff user"""
    return User(id="staff-1", name="Staff Member", role=UserRole.STAFF)


@pytest.fixture
def regular_user():
    """Create a regular user"""
    return User(id="user-1", name="Regular User", role=UserRole.USER)


@pytest.fixture
def admin_user():
    """Create an admin user"""
    return User(id="admin-1", name="Admin User", role=UserRole.ADMIN)


class TestBookingCreation:
    """Test booking creation"""
    
    def test_create_booking_request(self, system, bay1, regular_user):
        """Test creating a booking request"""
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        booking = system.create_booking_request(
            resource=bay1,
            requester=regular_user,
            start_time=start,
            end_time=end,
            purpose="Training",
            priority=1
        )
        
        assert booking.resource == bay1
        assert booking.requester == regular_user
        assert booking.status == BookingStatus.PENDING
        assert booking.purpose == "Training"
        assert booking.priority == 1
        assert len(system.bookings) == 1
        assert len(system.audit_log) == 1
        assert system.audit_log[0].action == ActionType.CREATE
    
    def test_booking_end_before_start_raises_error(self, bay1, regular_user):
        """Test that booking with end time before start time raises error"""
        start = datetime.now()
        end = start - timedelta(hours=1)
        
        with pytest.raises(ValueError, match="End time must be after start time"):
            Booking(
                id="",
                resource=bay1,
                requester=regular_user,
                start_time=start,
                end_time=end
            )


class TestConflictDetection:
    """Test conflict detection"""
    
    def test_no_conflict_different_resources(self, system, bay1, bay2, regular_user, staff_user):
        """Test no conflict when booking different resources"""
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        booking1 = system.create_booking_request(bay1, regular_user, start, end)
        system.approve_booking(booking1, staff_user)
        
        booking2 = system.create_booking_request(bay2, regular_user, start, end)
        conflicts = system.check_conflicts(booking2)
        
        assert len(conflicts) == 0
    
    def test_conflict_overlapping_times(self, system, bay1, regular_user, staff_user):
        """Test conflict when times overlap"""
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        booking1 = system.create_booking_request(bay1, regular_user, start, end)
        system.approve_booking(booking1, staff_user)
        
        # Overlapping booking
        booking2 = system.create_booking_request(
            bay1, regular_user, 
            start + timedelta(hours=1), 
            end + timedelta(hours=1)
        )
        conflicts = system.check_conflicts(booking2)
        
        assert len(conflicts) == 1
        assert conflicts[0] == booking1
    
    def test_no_conflict_sequential_bookings(self, system, bay1, regular_user, staff_user):
        """Test no conflict for sequential bookings"""
        start1 = datetime.now()
        end1 = start1 + timedelta(hours=2)
        
        booking1 = system.create_booking_request(bay1, regular_user, start1, end1)
        system.approve_booking(booking1, staff_user)
        
        # Sequential booking (starts when first ends)
        booking2 = system.create_booking_request(bay1, regular_user, end1, end1 + timedelta(hours=2))
        conflicts = system.check_conflicts(booking2)
        
        assert len(conflicts) == 0


class TestApproval:
    """Test booking approval"""
    
    def test_staff_can_approve(self, system, bay1, regular_user, staff_user):
        """Test that staff can approve bookings"""
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        booking = system.create_booking_request(bay1, regular_user, start, end)
        result = system.approve_booking(booking, staff_user)
        
        assert result is True
        assert booking.status == BookingStatus.APPROVED
        assert len([e for e in system.audit_log if e.action == ActionType.APPROVE]) == 1
    
    def test_admin_can_approve(self, system, bay1, regular_user, admin_user):
        """Test that admin can approve bookings"""
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        booking = system.create_booking_request(bay1, regular_user, start, end)
        result = system.approve_booking(booking, admin_user)
        
        assert result is True
        assert booking.status == BookingStatus.APPROVED
    
    def test_regular_user_cannot_approve(self, system, bay1, regular_user):
        """Test that regular users cannot approve bookings"""
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        booking = system.create_booking_request(bay1, regular_user, start, end)
        
        with pytest.raises(PermissionError, match="Only staff or admin can approve bookings"):
            system.approve_booking(booking, regular_user)
    
    def test_approve_with_conflict_fails_without_override(self, system, bay1, regular_user, staff_user):
        """Test that approval fails when there's a conflict and no override"""
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        booking1 = system.create_booking_request(bay1, regular_user, start, end)
        system.approve_booking(booking1, staff_user)
        
        booking2 = system.create_booking_request(bay1, regular_user, start, end)
        result = system.approve_booking(booking2, staff_user, force_override=False)
        
        assert result is False
        assert booking2.status == BookingStatus.PENDING
    
    def test_approve_with_override(self, system, bay1, regular_user, staff_user):
        """Test that approval succeeds with override despite conflict"""
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        booking1 = system.create_booking_request(bay1, regular_user, start, end)
        system.approve_booking(booking1, staff_user)
        
        booking2 = system.create_booking_request(bay1, regular_user, start, end)
        result = system.approve_booking(booking2, staff_user, force_override=True)
        
        assert result is True
        assert booking2.status == BookingStatus.APPROVED
        # Check for override action in audit log
        override_entries = [e for e in system.audit_log if e.action == ActionType.OVERRIDE]
        assert len(override_entries) == 1


class TestDenial:
    """Test booking denial"""
    
    def test_staff_can_deny(self, system, bay1, regular_user, staff_user):
        """Test that staff can deny bookings"""
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        booking = system.create_booking_request(bay1, regular_user, start, end)
        system.deny_booking(booking, staff_user, reason="Resource unavailable")
        
        assert booking.status == BookingStatus.DENIED
        deny_entries = [e for e in system.audit_log if e.action == ActionType.DENY]
        assert len(deny_entries) == 1
        assert "Resource unavailable" in deny_entries[0].details
    
    def test_regular_user_cannot_deny(self, system, bay1, regular_user):
        """Test that regular users cannot deny bookings"""
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        booking = system.create_booking_request(bay1, regular_user, start, end)
        
        with pytest.raises(PermissionError, match="Only staff or admin can deny bookings"):
            system.deny_booking(booking, regular_user)


class TestRescheduling:
    """Test booking rescheduling"""
    
    def test_staff_can_reschedule(self, system, bay1, regular_user, staff_user):
        """Test that staff can reschedule bookings"""
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        booking = system.create_booking_request(bay1, regular_user, start, end)
        system.approve_booking(booking, staff_user)
        
        new_start = start + timedelta(days=1)
        new_end = new_start + timedelta(hours=2)
        
        result = system.reschedule_booking(booking, staff_user, new_start, new_end)
        
        assert result is True
        assert booking.start_time == new_start
        assert booking.end_time == new_end
        reschedule_entries = [e for e in system.audit_log if e.action == ActionType.RESCHEDULE]
        assert len(reschedule_entries) == 1
    
    def test_reschedule_with_conflict_fails_without_override(self, system, bay1, regular_user, staff_user):
        """Test that rescheduling fails with conflict and no override"""
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        booking1 = system.create_booking_request(bay1, regular_user, start, end)
        system.approve_booking(booking1, staff_user)
        
        booking2 = system.create_booking_request(
            bay1, regular_user,
            start + timedelta(days=1),
            end + timedelta(days=1)
        )
        system.approve_booking(booking2, staff_user)
        
        # Try to reschedule booking2 to conflict with booking1
        result = system.reschedule_booking(booking2, staff_user, start, end, force_override=False)
        
        assert result is False
        # booking2 should still be at original time
        assert booking2.start_time == start + timedelta(days=1)
    
    def test_reschedule_with_override(self, system, bay1, regular_user, staff_user):
        """Test that rescheduling succeeds with override"""
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        booking1 = system.create_booking_request(bay1, regular_user, start, end)
        system.approve_booking(booking1, staff_user)
        
        booking2 = system.create_booking_request(
            bay1, regular_user,
            start + timedelta(days=1),
            end + timedelta(days=1)
        )
        system.approve_booking(booking2, staff_user)
        
        # Reschedule with override
        result = system.reschedule_booking(booking2, staff_user, start, end, force_override=True)
        
        assert result is True
        assert booking2.start_time == start
    
    def test_regular_user_cannot_reschedule(self, system, bay1, regular_user, staff_user):
        """Test that regular users cannot reschedule bookings"""
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        booking = system.create_booking_request(bay1, regular_user, start, end)
        system.approve_booking(booking, staff_user)
        
        new_start = start + timedelta(days=1)
        new_end = new_start + timedelta(hours=2)
        
        with pytest.raises(PermissionError, match="Only staff or admin can reschedule bookings"):
            system.reschedule_booking(booking, regular_user, new_start, new_end)


class TestBumping:
    """Test booking bumping"""
    
    def test_staff_can_bump_booking(self, system, bay1, regular_user, staff_user):
        """Test that staff can bump bookings"""
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        booking1 = system.create_booking_request(bay1, regular_user, start, end, priority=1)
        system.approve_booking(booking1, staff_user)
        
        booking2 = system.create_booking_request(bay1, regular_user, start, end, priority=5)
        
        system.bump_booking(
            booking_to_bump=booking1,
            bumper=staff_user,
            higher_priority_booking=booking2,
            reason="Higher priority training needed"
        )
        
        assert booking1.status == BookingStatus.BUMPED
        bump_entries = [e for e in system.audit_log if e.action == ActionType.BUMP]
        assert len(bump_entries) == 1
        assert "Higher priority training needed" in bump_entries[0].details
    
    def test_regular_user_cannot_bump(self, system, bay1, regular_user, staff_user):
        """Test that regular users cannot bump bookings"""
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        booking1 = system.create_booking_request(bay1, regular_user, start, end)
        system.approve_booking(booking1, staff_user)
        
        booking2 = system.create_booking_request(bay1, regular_user, start, end)
        
        with pytest.raises(PermissionError, match="Only staff or admin can bump bookings"):
            system.bump_booking(booking1, regular_user, booking2)


class TestCancellation:
    """Test booking cancellation"""
    
    def test_requester_can_cancel_own_booking(self, system, bay1, regular_user):
        """Test that requester can cancel their own booking"""
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        booking = system.create_booking_request(bay1, regular_user, start, end)
        system.cancel_booking(booking, regular_user, reason="No longer needed")
        
        assert booking.status == BookingStatus.CANCELLED
        cancel_entries = [e for e in system.audit_log if e.action == ActionType.CANCEL]
        assert len(cancel_entries) == 1
    
    def test_staff_can_cancel_any_booking(self, system, bay1, regular_user, staff_user):
        """Test that staff can cancel any booking"""
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        booking = system.create_booking_request(bay1, regular_user, start, end)
        system.cancel_booking(booking, staff_user, reason="Facility maintenance")
        
        assert booking.status == BookingStatus.CANCELLED
    
    def test_user_cannot_cancel_others_booking(self, system, bay1, regular_user):
        """Test that user cannot cancel another user's booking"""
        other_user = User(id="user-2", name="Other User", role=UserRole.USER)
        
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        booking = system.create_booking_request(bay1, other_user, start, end)
        
        with pytest.raises(PermissionError, match="Only the requester or staff can cancel a booking"):
            system.cancel_booking(booking, regular_user)


class TestAuditTrail:
    """Test audit trail functionality"""
    
    def test_audit_trail_records_all_actions(self, system, bay1, regular_user, staff_user):
        """Test that audit trail records all actions"""
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        booking = system.create_booking_request(bay1, regular_user, start, end)
        system.approve_booking(booking, staff_user)
        system.cancel_booking(booking, staff_user)
        
        assert len(system.audit_log) == 3  # create, approve, cancel
        assert system.audit_log[0].action == ActionType.CREATE
        assert system.audit_log[1].action == ActionType.APPROVE
        assert system.audit_log[2].action == ActionType.CANCEL
    
    def test_get_audit_trail_by_booking(self, system, bay1, bay2, regular_user, staff_user):
        """Test filtering audit trail by booking"""
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        booking1 = system.create_booking_request(bay1, regular_user, start, end)
        booking2 = system.create_booking_request(bay2, regular_user, start, end)
        
        system.approve_booking(booking1, staff_user)
        system.approve_booking(booking2, staff_user)
        
        booking1_trail = system.get_audit_trail(booking_id=booking1.id)
        
        assert len(booking1_trail) == 2  # create and approve for booking1
        assert all(e.booking.id == booking1.id for e in booking1_trail)
    
    def test_audit_trail_includes_previous_state(self, system, bay1, regular_user, staff_user):
        """Test that audit trail includes previous state"""
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        booking = system.create_booking_request(bay1, regular_user, start, end)
        system.approve_booking(booking, staff_user)
        
        approve_entry = [e for e in system.audit_log if e.action == ActionType.APPROVE][0]
        assert approve_entry.previous_state is not None
        assert approve_entry.previous_state["status"] == BookingStatus.PENDING.value


class TestResourceQueries:
    """Test resource query functionality"""
    
    def test_get_bookings_by_resource(self, system, bay1, bay2, regular_user, staff_user):
        """Test getting bookings by resource"""
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        booking1 = system.create_booking_request(bay1, regular_user, start, end)
        booking2 = system.create_booking_request(bay1, regular_user, start + timedelta(days=1), end + timedelta(days=1))
        booking3 = system.create_booking_request(bay2, regular_user, start, end)
        
        system.approve_booking(booking1, staff_user)
        system.approve_booking(booking2, staff_user)
        system.approve_booking(booking3, staff_user)
        
        bay1_bookings = system.get_bookings_by_resource(bay1.id)
        
        assert len(bay1_bookings) == 2
        assert all(b.resource.id == bay1.id for b in bay1_bookings)
    
    def test_get_bookings_by_status(self, system, bay1, regular_user, staff_user):
        """Test filtering bookings by status"""
        start = datetime.now()
        end = start + timedelta(hours=2)
        
        booking1 = system.create_booking_request(bay1, regular_user, start, end)
        booking2 = system.create_booking_request(bay1, regular_user, start + timedelta(days=1), end + timedelta(days=1))
        
        system.approve_booking(booking1, staff_user)
        
        approved = system.get_bookings_by_resource(bay1.id, status=BookingStatus.APPROVED)
        pending = system.get_bookings_by_resource(bay1.id, status=BookingStatus.PENDING)
        
        assert len(approved) == 1
        assert len(pending) == 1
    
    def test_bookings_sorted_by_start_time(self, system, bay1, regular_user, staff_user):
        """Test that bookings are sorted by start time"""
        now = datetime.now()
        
        booking1 = system.create_booking_request(bay1, regular_user, now + timedelta(days=2), now + timedelta(days=2, hours=2))
        booking2 = system.create_booking_request(bay1, regular_user, now, now + timedelta(hours=2))
        booking3 = system.create_booking_request(bay1, regular_user, now + timedelta(days=1), now + timedelta(days=1, hours=2))
        
        bookings = system.get_bookings_by_resource(bay1.id)
        
        assert bookings[0] == booking2
        assert bookings[1] == booking3
        assert bookings[2] == booking1
