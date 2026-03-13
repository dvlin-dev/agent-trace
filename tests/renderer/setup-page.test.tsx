import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SetupForm } from "../../src/renderer/src/components/setup-form";

describe("SetupForm", () => {
  let onSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSubmit = vi.fn().mockResolvedValue(undefined);
  });

  it("renders TARGET_URL input", () => {
    render(<SetupForm onSubmit={onSubmit} />);
    expect(screen.getByLabelText("TARGET_URL")).toBeInTheDocument();
  });

  it("has placeholder text", () => {
    render(<SetupForm onSubmit={onSubmit} />);
    expect(
      screen.getByPlaceholderText("https://api.anthropic.com"),
    ).toBeInTheDocument();
  });

  it("button is disabled when input is empty", () => {
    render(<SetupForm onSubmit={onSubmit} />);
    const button = screen.getByRole("button", { name: /save and continue/i });
    expect(button).toBeDisabled();
  });

  it("button is enabled when input has value", () => {
    render(<SetupForm onSubmit={onSubmit} />);
    const input = screen.getByLabelText("TARGET_URL");
    fireEvent.change(input, { target: { value: "https://api.anthropic.com" } });
    const button = screen.getByRole("button", { name: /save and continue/i });
    expect(button).not.toBeDisabled();
  });

  it("calls onSubmit with trimmed URL on form submit", async () => {
    render(<SetupForm onSubmit={onSubmit} />);
    const input = screen.getByLabelText("TARGET_URL");
    fireEvent.change(input, {
      target: { value: "  https://api.anthropic.com  " },
    });
    const button = screen.getByRole("button", { name: /save and continue/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith("https://api.anthropic.com");
    });
  });

  it("does not show API Key or other config fields", () => {
    render(<SetupForm onSubmit={onSubmit} />);
    expect(screen.queryByText(/api.?key/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/port/i)).not.toBeInTheDocument();
  });

  it("shows helper text", () => {
    render(<SetupForm onSubmit={onSubmit} />);
    expect(
      screen.getByText(/claude code api requests will be forwarded/i),
    ).toBeInTheDocument();
  });
});
