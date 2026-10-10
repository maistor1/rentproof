// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NewRentalForm } from "@/app/rentals/new/NewRentalForm";
import { makeRental } from "@/test/fixtures";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/client/rentalsApi", () => ({ createRental: vi.fn() }));

const { createRental } = await import("@/lib/client/rentalsApi");
const create = vi.mocked(createRental);

async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Machine name"), "Mini excavator");
  await user.type(screen.getByLabelText("Model"), "Kubota U27-4");
  await user.type(screen.getByLabelText("Serial number"), "KBU27-0042");
  await user.type(screen.getByLabelText("Customer name"), "Bau AG");
  await user.type(screen.getByLabelText("Customer email"), "yard@bau.example");
}

const submit = () => screen.getByRole("button", { name: "Create and take check-out photos" });

beforeEach(() => {
  push.mockReset();
  create.mockReset();
});

describe("NewRentalForm", () => {
  it("never asks for hours", () => {
    render(<NewRentalForm />);
    expect(screen.queryByLabelText(/hour/i)).not.toBeInTheDocument();
  });

  it("names the empty fields and doesn't post", async () => {
    const user = userEvent.setup();
    render(<NewRentalForm />);
    await user.type(screen.getByLabelText("Machine name"), "Mini excavator");
    await user.click(submit());
    expect(screen.getByRole("alert")).toHaveTextContent("Fill in: Model, Serial number, Customer name, Customer email");
    expect(create).not.toHaveBeenCalled();
  });

  it("posts the form and opens the check-out photos", async () => {
    create.mockResolvedValue({ ok: true, value: makeRental({ id: "R-abc12345" }) });
    const user = userEvent.setup();
    render(<NewRentalForm />);
    await fill(user);
    await user.click(submit());
    expect(create).toHaveBeenCalledWith({
      machine: { name: "Mini excavator", model: "Kubota U27-4", serialNumber: "KBU27-0042" },
      customer: { name: "Bau AG", email: "yard@bau.example" },
    });
    expect(push).toHaveBeenCalledWith("/checkout/R-abc12345");
  });

  it("shows the server's friendly error and keeps the input", async () => {
    create.mockResolvedValue({ ok: false, error: { kind: "bad_request", message: "That didn't look right. Check and try again." } });
    const user = userEvent.setup();
    render(<NewRentalForm />);
    await fill(user);
    await user.click(submit());
    expect(await screen.findByRole("alert")).toHaveTextContent("That didn't look right");
    expect(screen.getByLabelText("Machine name")).toHaveValue("Mini excavator");
    expect(push).not.toHaveBeenCalled();
  });
});
