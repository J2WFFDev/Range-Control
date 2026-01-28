"""
Example usage of the RangeBookingAutomation system
"""

from datetime import datetime, timedelta
from range_booking_automation import (
    RangeBookingAutomation,
    Resource,
    User,
    UserRole,
    BookingStatus
)


def main():
    """Demonstrate the RangeBookingAutomation system"""
    
    # Initialize the system
    system = RangeBookingAutomation()
    
    print("=" * 60)
    print("Range Booking Automation System - Demo")
    print("=" * 60)
    print()
    
    # Create resources
    bay1 = Resource(id="bay-1", name="Bay 1", resource_type="bay")
    bay2 = Resource(id="bay-2", name="Bay 2", resource_type="bay")
    facility1 = Resource(id="facility-1", name="Meeting Room", resource_type="facility")
    
    system.register_resource(bay1)
    system.register_resource(bay2)
    system.register_resource(facility1)
    
    print("Resources registered:")
    print(f"  - {bay1.name} ({bay1.resource_type})")
    print(f"  - {bay2.name} ({bay2.resource_type})")
    print(f"  - {facility1.name} ({facility1.resource_type})")
    print()
    
    # Create users
    staff = User(id="staff-1", name="Jane Smith", role=UserRole.STAFF)
    user1 = User(id="user-1", name="John Doe", role=UserRole.USER)
    user2 = User(id="user-2", name="Alice Johnson", role=UserRole.USER)
    
    system.register_user(staff)
    system.register_user(user1)
    system.register_user(user2)
    
    print("Users registered:")
    print(f"  - {staff.name} ({staff.role.value})")
    print(f"  - {user1.name} ({user1.role.value})")
    print(f"  - {user2.name} ({user2.role.value})")
    print()
    
    # Example 1: Simple booking request and approval
    print("-" * 60)
    print("Example 1: Simple Booking Request and Approval")
    print("-" * 60)
    
    start_time = datetime.now() + timedelta(hours=1)
    end_time = start_time + timedelta(hours=2)
    
    booking1 = system.create_booking_request(
        resource=bay1,
        requester=user1,
        start_time=start_time,
        end_time=end_time,
        purpose="Safety training session",
        priority=1
    )
    
    print(f"Booking created: {booking1.id}")
    print(f"  Resource: {booking1.resource.name}")
    print(f"  Requester: {booking1.requester.name}")
    print(f"  Time: {booking1.start_time.strftime('%Y-%m-%d %H:%M')} - {booking1.end_time.strftime('%H:%M')}")
    print(f"  Status: {booking1.status.value}")
    print()
    
    # Staff approves the booking
    result = system.approve_booking(booking1, staff)
    print(f"Approval result: {'Success' if result else 'Failed'}")
    print(f"  New status: {booking1.status.value}")
    print()
    
    # Example 2: Conflict detection
    print("-" * 60)
    print("Example 2: Conflict Detection")
    print("-" * 60)
    
    booking2 = system.create_booking_request(
        resource=bay1,
        requester=user2,
        start_time=start_time + timedelta(minutes=30),  # Overlaps with booking1
        end_time=end_time + timedelta(minutes=30),
        purpose="Equipment testing",
        priority=1
    )
    
    print(f"Booking created: {booking2.id}")
    print(f"  Time: {booking2.start_time.strftime('%Y-%m-%d %H:%M')} - {booking2.end_time.strftime('%H:%M')}")
    
    conflicts = system.check_conflicts(booking2)
    print(f"  Conflicts detected: {len(conflicts)}")
    for conflict in conflicts:
        print(f"    - Conflicts with booking {conflict.id} ({conflict.requester.name})")
    print()
    
    # Try to approve without override
    result = system.approve_booking(booking2, staff, force_override=False)
    print(f"Approval without override: {'Success' if result else 'Failed'}")
    print(f"  Status: {booking2.status.value}")
    print()
    
    # Example 3: Override conflict
    print("-" * 60)
    print("Example 3: Override Conflict")
    print("-" * 60)
    
    booking3 = system.create_booking_request(
        resource=bay1,
        requester=user2,
        start_time=start_time,
        end_time=end_time,
        purpose="Emergency safety drill",
        priority=10  # High priority
    )
    
    print(f"High priority booking created: {booking3.id}")
    print(f"  Purpose: {booking3.purpose}")
    print(f"  Priority: {booking3.priority}")
    
    result = system.approve_booking(booking3, staff, force_override=True)
    print(f"Approval with override: {'Success' if result else 'Failed'}")
    print(f"  Status: {booking3.status.value}")
    print()
    
    # Example 4: Bumping a booking
    print("-" * 60)
    print("Example 4: Bumping a Lower Priority Booking")
    print("-" * 60)
    
    system.bump_booking(
        booking_to_bump=booking1,
        bumper=staff,
        higher_priority_booking=booking3,
        reason="Emergency safety drill takes precedence"
    )
    
    print(f"Booking {booking1.id} bumped")
    print(f"  New status: {booking1.status.value}")
    print(f"  Reason: Emergency safety drill takes precedence")
    print()
    
    # Example 5: Rescheduling
    print("-" * 60)
    print("Example 5: Rescheduling a Booking")
    print("-" * 60)
    
    new_start = start_time + timedelta(days=1)
    new_end = end_time + timedelta(days=1)
    
    result = system.reschedule_booking(
        booking=booking1,
        rescheduler=staff,
        new_start_time=new_start,
        new_end_time=new_end
    )
    
    print(f"Rescheduling result: {'Success' if result else 'Failed'}")
    print(f"  New time: {booking1.start_time.strftime('%Y-%m-%d %H:%M')} - {booking1.end_time.strftime('%H:%M')}")
    print(f"  Status: {booking1.status.value}")
    print()
    
    # Example 6: User cancels their own booking
    print("-" * 60)
    print("Example 6: User Cancels Own Booking")
    print("-" * 60)
    
    booking4 = system.create_booking_request(
        resource=bay2,
        requester=user1,
        start_time=datetime.now() + timedelta(days=2),
        end_time=datetime.now() + timedelta(days=2, hours=1),
        purpose="Practice session"
    )
    
    print(f"Booking created: {booking4.id}")
    print(f"  Resource: {booking4.resource.name}")
    
    system.cancel_booking(booking4, user1, reason="Schedule conflict")
    print(f"Booking cancelled by user")
    print(f"  Status: {booking4.status.value}")
    print()
    
    # Example 7: View audit trail
    print("-" * 60)
    print("Example 7: Audit Trail")
    print("-" * 60)
    
    audit_entries = system.get_audit_trail(booking_id=booking1.id)
    print(f"Audit trail for booking {booking1.id}:")
    for entry in audit_entries:
        print(f"  [{entry.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] {entry.action.value}")
        print(f"    Actor: {entry.actor.name}")
        print(f"    Details: {entry.details}")
        if entry.previous_state:
            print(f"    Previous state: {entry.previous_state}")
    print()
    
    # Example 8: View all bookings for a resource
    print("-" * 60)
    print("Example 8: View All Bookings for Bay 1")
    print("-" * 60)
    
    bay1_bookings = system.get_bookings_by_resource(bay1.id)
    print(f"Total bookings for {bay1.name}: {len(bay1_bookings)}")
    for booking in bay1_bookings:
        print(f"  - {booking.id}")
        print(f"    Requester: {booking.requester.name}")
        print(f"    Time: {booking.start_time.strftime('%Y-%m-%d %H:%M')} - {booking.end_time.strftime('%H:%M')}")
        print(f"    Status: {booking.status.value}")
        print(f"    Purpose: {booking.purpose}")
    print()
    
    # Summary
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Total bookings created: {len(system.bookings)}")
    print(f"Total audit log entries: {len(system.audit_log)}")
    
    status_counts = {}
    for booking in system.bookings:
        status = booking.status.value
        status_counts[status] = status_counts.get(status, 0) + 1
    
    print("\nBookings by status:")
    for status, count in status_counts.items():
        print(f"  {status}: {count}")
    print()
    
    print("=" * 60)
    print("Demo Complete")
    print("=" * 60)


if __name__ == "__main__":
    main()
