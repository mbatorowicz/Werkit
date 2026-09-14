import { describe, expect, it } from "vitest";
import { sessionInsertFromAcceptedOrder } from "@/lib/sessionSnapshotFromOrder";

const order = {
  id: 10,
  categoryId: 2,
  resourceId: 3,
  materialId: 8,
  customerId: 4,
  taskDescription: "Załadunek",
  quantityTons: "15.00",
  expectedDurationHours: "2.50",
  dueDate: null,
  orderType: "machine_work" as const,
  repairDescription: null,
};

describe("sessionInsertFromAcceptedOrder", () => {
  it("kopiuje orderType, materialId i quantityTons ze zlecenia na sesję", () => {
    const values = sessionInsertFromAcceptedOrder(order, { companyId: 1, userId: 9 });
    expect(values.orderType).toBe("machine_work");
    expect(values.materialId).toBe(8);
    expect(values.quantityTons).toBe("15.00");
    expect(values.workOrderId).toBe(10);
    expect(values.resourceId).toBe(3);
    expect(values.status).toBe("IN_PROGRESS");
  });

  it("kopiuje snapshot naprawy bez materiału", () => {
    const values = sessionInsertFromAcceptedOrder(
      {
        ...order,
        materialId: null,
        quantityTons: null,
        orderType: "machine_repair",
        taskDescription: null,
        repairDescription: "Wymiana łożyska",
      },
      { companyId: 1, userId: 9, startCoord: { lat: "50.1", lng: "20.1" } }
    );
    expect(values.orderType).toBe("machine_repair");
    expect(values.materialId).toBeNull();
    expect(values.quantityTons).toBeNull();
    expect(values.repairDescription).toBe("Wymiana łożyska");
    expect(values.startLatitude).toBe("50.1");
    expect(values.startLongitude).toBe("20.1");
  });
});
