"""
RangeBookingAutomation - A controlled scheduling and approval system for managing 
shared range resources such as bays and facilities.

This system handles:
- Booking requests collection
- Approval rules enforcement
- Conflict checking
- Audit trail recording
- Staff actions: approve, deny, reschedule, override conflicts, bump bookings
- Safety, accountability, and clear authority
- Accurate time handling
- Transparent conflict resolution
"""

from datetime import datetime, timedelta
from enum import Enum
from typing import List, Optional, Dict
from dataclasses import dataclass, field
import uuid


class BookingStatus(Enum):
    """Status of a booking request"""
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"
    CANCELLED = "cancelled"
    BUMPED = "bumped"


class UserRole(Enum):
    """User roles in the system"""
    STAFF = "staff"
    USER = "user"
    ADMIN = "admin"


class ActionType(Enum):
    """Types of actions in the system"""
    CREATE = "create"
    APPROVE = "approve"
    DENY = "deny"
    RESCHEDULE = "reschedule"
    OVERRIDE = "override"
    BUMP = "bump"
    CANCEL = "cancel"


@dataclass
class User:
    """Represents a user in the system"""
    id: str
    name: str
    role: UserRole
    
    def __post_init__(self):
        if not self.id:
            self.id = str(uuid.uuid4())


@dataclass
class Resource:
    """Represents a shared resource (bay or facility)"""
    id: str
    name: str
    resource_type: str  # 'bay' or 'facility'
    capacity: int = 1
    
    def __post_init__(self):
        if not self.id:
            self.id = str(uuid.uuid4())


@dataclass
class Booking:
    """Represents a booking request"""
    id: str
    resource: Resource
    requester: User
    start_time: datetime
    end_time: datetime
    status: BookingStatus = BookingStatus.PENDING
    purpose: str = ""
    priority: int = 0  # Higher number = higher priority
    created_at: datetime = field(default_factory=datetime.now)
    
    def __post_init__(self):
        if not self.id:
            self.id = str(uuid.uuid4())
        if self.end_time <= self.start_time:
            raise ValueError("End time must be after start time")
    
    def overlaps_with(self, other: 'Booking') -> bool:
        """Check if this booking overlaps with another booking"""
        return (self.resource.id == other.resource.id and
                self.start_time < other.end_time and
                self.end_time > other.start_time)


@dataclass
class AuditLogEntry:
    """Represents an audit log entry"""
    id: str
    timestamp: datetime
    action: ActionType
    actor: User
    booking: Booking
    details: str = ""
    previous_state: Optional[Dict] = None
    
    def __post_init__(self):
        if not self.id:
            self.id = str(uuid.uuid4())


class RangeBookingAutomation:
    """
    Main automation system for managing range bookings with approval workflow,
    conflict resolution, and audit trail.
    """
    
    def __init__(self):
        self.bookings: List[Booking] = []
        self.audit_log: List[AuditLogEntry] = []
        self.resources: Dict[str, Resource] = {}
        self.users: Dict[str, User] = {}
    
    def register_resource(self, resource: Resource) -> None:
        """Register a resource in the system"""
        self.resources[resource.id] = resource
    
    def register_user(self, user: User) -> None:
        """Register a user in the system"""
        self.users[user.id] = user
    
    def create_booking_request(
        self,
        resource: Resource,
        requester: User,
        start_time: datetime,
        end_time: datetime,
        purpose: str = "",
        priority: int = 0
    ) -> Booking:
        """
        Create a new booking request
        
        Args:
            resource: The resource to book
            requester: The user making the request
            start_time: Start time of the booking
            end_time: End time of the booking
            purpose: Purpose of the booking
            priority: Priority level (higher = more important)
            
        Returns:
            The created booking
        """
        booking = Booking(
            id="",
            resource=resource,
            requester=requester,
            start_time=start_time,
            end_time=end_time,
            purpose=purpose,
            priority=priority
        )
        
        self.bookings.append(booking)
        
        # Log the creation
        self._add_audit_log(
            action=ActionType.CREATE,
            actor=requester,
            booking=booking,
            details=f"Booking request created for {resource.name}"
        )
        
        return booking
    
    def check_conflicts(self, booking: Booking) -> List[Booking]:
        """
        Check for conflicts with existing approved bookings
        
        Args:
            booking: The booking to check
            
        Returns:
            List of conflicting bookings
        """
        conflicts = []
        for existing in self.bookings:
            if (existing.id != booking.id and 
                existing.status == BookingStatus.APPROVED and
                booking.overlaps_with(existing)):
                conflicts.append(existing)
        return conflicts
    
    def approve_booking(
        self,
        booking: Booking,
        approver: User,
        force_override: bool = False
    ) -> bool:
        """
        Approve a booking request
        
        Args:
            booking: The booking to approve
            approver: The staff member approving
            force_override: Whether to override conflicts
            
        Returns:
            True if approved, False if there are conflicts and no override
        """
        if not self._is_staff_or_admin(approver):
            raise PermissionError("Only staff or admin can approve bookings")
        
        conflicts = self.check_conflicts(booking)
        
        if conflicts and not force_override:
            details = f"Cannot approve due to conflicts with bookings: {[c.id for c in conflicts]}"
            self._add_audit_log(
                action=ActionType.APPROVE,
                actor=approver,
                booking=booking,
                details=details
            )
            return False
        
        previous_state = {"status": booking.status.value}
        booking.status = BookingStatus.APPROVED
        
        details = "Booking approved"
        if force_override and conflicts:
            details = f"Booking approved with override (conflicts: {[c.id for c in conflicts]})"
            self._add_audit_log(
                action=ActionType.OVERRIDE,
                actor=approver,
                booking=booking,
                details=details,
                previous_state=previous_state
            )
        else:
            self._add_audit_log(
                action=ActionType.APPROVE,
                actor=approver,
                booking=booking,
                details=details,
                previous_state=previous_state
            )
        
        return True
    
    def deny_booking(
        self,
        booking: Booking,
        denier: User,
        reason: str = ""
    ) -> None:
        """
        Deny a booking request
        
        Args:
            booking: The booking to deny
            denier: The staff member denying
            reason: Reason for denial
        """
        if not self._is_staff_or_admin(denier):
            raise PermissionError("Only staff or admin can deny bookings")
        
        previous_state = {"status": booking.status.value}
        booking.status = BookingStatus.DENIED
        
        self._add_audit_log(
            action=ActionType.DENY,
            actor=denier,
            booking=booking,
            details=f"Booking denied. Reason: {reason}",
            previous_state=previous_state
        )
    
    def reschedule_booking(
        self,
        booking: Booking,
        rescheduler: User,
        new_start_time: datetime,
        new_end_time: datetime,
        force_override: bool = False
    ) -> bool:
        """
        Reschedule a booking
        
        Args:
            booking: The booking to reschedule
            rescheduler: The staff member rescheduling
            new_start_time: New start time
            new_end_time: New end time
            force_override: Whether to override conflicts
            
        Returns:
            True if rescheduled successfully, False otherwise
        """
        if not self._is_staff_or_admin(rescheduler):
            raise PermissionError("Only staff or admin can reschedule bookings")
        
        if new_end_time <= new_start_time:
            raise ValueError("End time must be after start time")
        
        # Store previous state
        previous_state = {
            "start_time": booking.start_time.isoformat(),
            "end_time": booking.end_time.isoformat(),
            "status": booking.status.value
        }
        
        # Temporarily update times to check conflicts
        old_start = booking.start_time
        old_end = booking.end_time
        booking.start_time = new_start_time
        booking.end_time = new_end_time
        
        conflicts = self.check_conflicts(booking)
        
        if conflicts and not force_override:
            # Revert times
            booking.start_time = old_start
            booking.end_time = old_end
            
            details = f"Cannot reschedule due to conflicts with bookings: {[c.id for c in conflicts]}"
            self._add_audit_log(
                action=ActionType.RESCHEDULE,
                actor=rescheduler,
                booking=booking,
                details=details
            )
            return False
        
        # Keep the new times
        booking.status = BookingStatus.APPROVED
        
        details = f"Booking rescheduled from {old_start} to {new_start_time}"
        if force_override and conflicts:
            details += f" (overriding conflicts: {[c.id for c in conflicts]})"
        
        self._add_audit_log(
            action=ActionType.RESCHEDULE,
            actor=rescheduler,
            booking=booking,
            details=details,
            previous_state=previous_state
        )
        
        return True
    
    def bump_booking(
        self,
        booking_to_bump: Booking,
        bumper: User,
        higher_priority_booking: Booking,
        reason: str = ""
    ) -> None:
        """
        Bump an existing booking to make room for a higher priority booking
        
        Args:
            booking_to_bump: The booking to be bumped
            bumper: The staff member performing the bump
            higher_priority_booking: The higher priority booking taking precedence
            reason: Reason for bumping
        """
        if not self._is_staff_or_admin(bumper):
            raise PermissionError("Only staff or admin can bump bookings")
        
        previous_state = {"status": booking_to_bump.status.value}
        booking_to_bump.status = BookingStatus.BUMPED
        
        details = (f"Booking bumped for higher priority booking {higher_priority_booking.id}. "
                  f"Reason: {reason}")
        
        self._add_audit_log(
            action=ActionType.BUMP,
            actor=bumper,
            booking=booking_to_bump,
            details=details,
            previous_state=previous_state
        )
    
    def cancel_booking(
        self,
        booking: Booking,
        canceller: User,
        reason: str = ""
    ) -> None:
        """
        Cancel a booking
        
        Args:
            booking: The booking to cancel
            canceller: The user cancelling (requester or staff)
            reason: Reason for cancellation
        """
        # Allow requester to cancel their own booking or staff to cancel any
        if booking.requester.id != canceller.id and not self._is_staff_or_admin(canceller):
            raise PermissionError("Only the requester or staff can cancel a booking")
        
        previous_state = {"status": booking.status.value}
        booking.status = BookingStatus.CANCELLED
        
        self._add_audit_log(
            action=ActionType.CANCEL,
            actor=canceller,
            booking=booking,
            details=f"Booking cancelled. Reason: {reason}",
            previous_state=previous_state
        )
    
    def get_audit_trail(
        self,
        booking_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[AuditLogEntry]:
        """
        Get audit trail entries
        
        Args:
            booking_id: Filter by booking ID
            start_date: Filter by start date
            end_date: Filter by end date
            
        Returns:
            List of audit log entries
        """
        entries = self.audit_log
        
        if booking_id:
            entries = [e for e in entries if e.booking.id == booking_id]
        
        if start_date:
            entries = [e for e in entries if e.timestamp >= start_date]
        
        if end_date:
            entries = [e for e in entries if e.timestamp <= end_date]
        
        return entries
    
    def get_bookings_by_resource(
        self,
        resource_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[BookingStatus] = None
    ) -> List[Booking]:
        """
        Get bookings for a specific resource
        
        Args:
            resource_id: The resource ID
            start_date: Filter by start date
            end_date: Filter by end date
            status: Filter by status
            
        Returns:
            List of bookings
        """
        bookings = [b for b in self.bookings if b.resource.id == resource_id]
        
        if start_date:
            bookings = [b for b in bookings if b.end_time >= start_date]
        
        if end_date:
            bookings = [b for b in bookings if b.start_time <= end_date]
        
        if status:
            bookings = [b for b in bookings if b.status == status]
        
        return sorted(bookings, key=lambda b: b.start_time)
    
    def _is_staff_or_admin(self, user: User) -> bool:
        """Check if user is staff or admin"""
        return user.role in [UserRole.STAFF, UserRole.ADMIN]
    
    def _add_audit_log(
        self,
        action: ActionType,
        actor: User,
        booking: Booking,
        details: str = "",
        previous_state: Optional[Dict] = None
    ) -> None:
        """Add an entry to the audit log"""
        entry = AuditLogEntry(
            id="",
            timestamp=datetime.now(),
            action=action,
            actor=actor,
            booking=booking,
            details=details,
            previous_state=previous_state
        )
        self.audit_log.append(entry)
