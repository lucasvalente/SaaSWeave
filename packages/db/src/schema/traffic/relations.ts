import { defineRelationsPart } from "drizzle-orm";

import { member, organization, user } from "#@/schema/auth.schema";

import { analysisFindings } from "./analysis-findings.schema";
import { analysisRuns } from "./analysis-runs.schema";
import { caseInstances } from "./case-instances.schema";
import { caseTimelineEvents } from "./case-timeline-events.schema";
import { cases } from "./cases.schema";
import { customerAddresses } from "./customer-addresses.schema";
import { customers } from "./customers.schema";
import { deadlines } from "./deadlines.schema";
import { documents } from "./documents.schema";
import { drivers } from "./drivers.schema";
import { equipmentVerifications } from "./equipment.schema";
import { idempotencyKeys } from "./idempotency-keys.schema";
import { membershipUnits } from "./membership-units.schema";
import { outboxEvents } from "./outbox-events.schema";
import { protocols } from "./protocols.schema";
import { trafficAuthorities } from "./traffic-authorities.schema";
import { trafficFines } from "./traffic-fines.schema";
import { units } from "./units.schema";
import { vehicles } from "./vehicles.schema";

export const trafficRelations = defineRelationsPart(
  {
    analysisFindings,
    analysisRuns,
    caseInstances,
    caseTimelineEvents,
    cases,
    customerAddresses,
    customers,
    deadlines,
    documents,
    drivers,
    equipmentVerifications,
    idempotencyKeys,
    member,
    membershipUnits,
    organization,
    outboxEvents,
    protocols,
    trafficAuthorities,
    trafficFines,
    units,
    user,
    vehicles
  },
  (r) => {
    return {
      customers: {
        organization: r.one.organization({
          from: r.customers.tenantId,
          to: r.organization.id
        }),
        addresses: r.many.customerAddresses({
          from: r.customers.id,
          to: r.customerAddresses.customerId
        }),
        drivers: r.many.drivers({
          from: r.customers.id,
          to: r.drivers.customerId
        }),
        vehicles: r.many.vehicles({
          from: r.customers.id,
          to: r.vehicles.customerId
        }),
        cases: r.many.cases({
          from: r.customers.id,
          to: r.cases.customerId
        })
      },
      customerAddresses: {
        customer: r.one.customers({
          from: r.customerAddresses.customerId,
          to: r.customers.id
        })
      },
      drivers: {
        customer: r.one.customers({
          from: r.drivers.customerId,
          to: r.customers.id
        }),
        trafficFines: r.many.trafficFines({
          from: r.drivers.id,
          to: r.trafficFines.driverId
        })
      },
      vehicles: {
        customer: r.one.customers({
          from: r.vehicles.customerId,
          to: r.customers.id
        }),
        trafficFines: r.many.trafficFines({
          from: r.vehicles.id,
          to: r.trafficFines.vehicleId
        })
      },
      trafficFines: {
        organization: r.one.organization({
          from: r.trafficFines.tenantId,
          to: r.organization.id
        }),
        vehicle: r.one.vehicles({
          from: r.trafficFines.vehicleId,
          to: r.vehicles.id
        }),
        driver: r.one.drivers({
          from: r.trafficFines.driverId,
          to: r.drivers.id
        }),
        authority: r.one.trafficAuthorities({
          from: r.trafficFines.trafficAuthorityId,
          to: r.trafficAuthorities.id
        }),
        equipment: r.one.equipmentVerifications({
          from: r.trafficFines.equipmentVerificationId,
          to: r.equipmentVerifications.id
        }),
        cases: r.many.cases({
          from: r.trafficFines.id,
          to: r.cases.trafficFineId
        }),
        deadlines: r.many.deadlines({
          from: r.trafficFines.id,
          to: r.deadlines.trafficFineId
        }),
        analysisRuns: r.many.analysisRuns({
          from: r.trafficFines.id,
          to: r.analysisRuns.trafficFineId
        })
      },
      cases: {
        organization: r.one.organization({
          from: r.cases.tenantId,
          to: r.organization.id
        }),
        customer: r.one.customers({
          from: r.cases.customerId,
          to: r.customers.id
        }),
        trafficFine: r.one.trafficFines({
          from: r.cases.trafficFineId,
          to: r.trafficFines.id
        }),
        unit: r.one.units({
          from: r.cases.unitId,
          to: r.units.id
        }),
        assignedUser: r.one.user({
          from: r.cases.assignedUserId,
          to: r.user.id
        }),
        instances: r.many.caseInstances({
          from: r.cases.id,
          to: r.caseInstances.caseId
        }),
        timelineEvents: r.many.caseTimelineEvents({
          from: r.cases.id,
          to: r.caseTimelineEvents.caseId
        }),
        deadlines: r.many.deadlines({
          from: r.cases.id,
          to: r.deadlines.caseId
        }),
        protocols: r.many.protocols({
          from: r.cases.id,
          to: r.protocols.caseId
        })
      },
      caseInstances: {
        case: r.one.cases({
          from: r.caseInstances.caseId,
          to: r.cases.id
        }),
        authority: r.one.trafficAuthorities({
          from: r.caseInstances.authorityId,
          to: r.trafficAuthorities.id
        })
      },
      caseTimelineEvents: {
        case: r.one.cases({
          from: r.caseTimelineEvents.caseId,
          to: r.cases.id
        }),
        actorUser: r.one.user({
          from: r.caseTimelineEvents.actorUserId,
          to: r.user.id
        })
      },
      deadlines: {
        case: r.one.cases({
          from: r.deadlines.caseId,
          to: r.cases.id
        }),
        trafficFine: r.one.trafficFines({
          from: r.deadlines.trafficFineId,
          to: r.trafficFines.id
        })
      },
      documents: {
        case: r.one.cases({
          from: r.documents.caseId,
          to: r.cases.id
        }),
        trafficFine: r.one.trafficFines({
          from: r.documents.trafficFineId,
          to: r.trafficFines.id
        }),
        customer: r.one.customers({
          from: r.documents.customerId,
          to: r.customers.id
        }),
        driver: r.one.drivers({
          from: r.documents.driverId,
          to: r.drivers.id
        })
      },
      protocols: {
        case: r.one.cases({
          from: r.protocols.caseId,
          to: r.cases.id
        }),
        authority: r.one.trafficAuthorities({
          from: r.protocols.authorityId,
          to: r.trafficAuthorities.id
        })
      },
      analysisRuns: {
        trafficFine: r.one.trafficFines({
          from: r.analysisRuns.trafficFineId,
          to: r.trafficFines.id
        }),
        case: r.one.cases({
          from: r.analysisRuns.caseId,
          to: r.cases.id
        }),
        findings: r.many.analysisFindings({
          from: r.analysisRuns.id,
          to: r.analysisFindings.analysisRunId
        })
      },
      analysisFindings: {
        analysisRun: r.one.analysisRuns({
          from: r.analysisFindings.analysisRunId,
          to: r.analysisRuns.id
        })
      },
      units: {
        organization: r.one.organization({
          from: r.units.tenantId,
          to: r.organization.id
        })
      },
      membershipUnits: {
        unit: r.one.units({
          from: r.membershipUnits.unitId,
          to: r.units.id
        })
      }
    };
  }
);
