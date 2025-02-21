import { LogLevel } from "@/types";
import { config } from "dotenv";
import { z } from "zod";

config();

interface CustomProcessEnv {
	PORT?: number;
	NODE_ENV?: "development" | "production" | "test";
	URL_WEBHOOK?: string;
	ENABLE_WEBHOOK?: boolean;
	ENABLE_WEBSOCKET?: boolean;
	BOT_NAME?: string;
	DATABASE_URL?: string;
	LOG_LEVEL?: LogLevel;
	RECONNECT_INTERVAL?: number;
	MAX_RECONNECT_RETRIES?: number;
	SSE_MAX_QR_GENERATION?: number;
	SESSION_CONFIG_ID?: string;
	API_KEY?: string;
}

const envSchema = z
	.object({
		PORT: z.number(),
		NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
		URL_WEBHOOK: z.string().optional(),
		ENABLE_WEBHOOK: z.boolean(),
		ENABLE_WEBSOCKET: z.boolean(),
		BOT_NAME: z.string().optional().default("Baileys Bot"),
		DATABASE_URL: z.string(),
		LOG_LEVEL: z.nativeEnum(LogLevel).default(LogLevel.INFO),
		RECONNECT_INTERVAL: z.number().default(0),
		MAX_RECONNECT_RETRIES: z.number().default(5),
		SSE_MAX_QR_GENERATION: z.number().default(5),
		SESSION_CONFIG_ID: z.string().optional().default("session-config"),
		API_KEY: z.string(),
	})
	.superRefine((data, ctx) => {
		if (data.ENABLE_WEBHOOK && !data.URL_WEBHOOK) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "URL_WEBHOOK is required when ENABLE_WEBHOOK is true",
				path: ["URL_WEBHOOK"],
			});
		}
	});

const processEnv: Partial<CustomProcessEnv> = {

	/**
	 * 
	 * PORT="3000"
NODE_ENV="development"
URL_WEBHOOK="http://localhost:3000/webhook"
ENABLE_WEBHOOK="true"
ENABLE_WEBSOCKET="true"
BOT_NAME="Whatsapp Bot"
DATABASE_URL="postgres://postgres:2024pass@postgresql-container:5432/zendy_whatsapp_db"
LOG_LEVEL="debug"
RECONNECT_INTERVAL="5000"
MAX_RECONNECT_RETRIES="5"
SSE_MAX_QR_GENERATION="10"
SESSION_CONFIG_ID="session-config"
API_KEY="a6bc226axxxxxxxxxxxxxx"

	 */
	PORT: 3002,
	NODE_ENV: "production",
	URL_WEBHOOK: "http://localhost:3000/webhook",
	ENABLE_WEBHOOK: process.env.ENABLE_WEBHOOK === "true",
	ENABLE_WEBSOCKET: process.env.ENABLE_WEBSOCKET === "true",
	BOT_NAME: "Whatsapp Bot",
	DATABASE_URL: "postgres://postgres:2024pass@postgresql-container:5432/zendy_whatsapp_db",
	LOG_LEVEL: "debug" as LogLevel,
	RECONNECT_INTERVAL: 5000,
	MAX_RECONNECT_RETRIES: 5,
	SSE_MAX_QR_GENERATION: 10,
	SESSION_CONFIG_ID: "session-config",
	API_KEY: "a6bc226axxxxxxxxxxxxxx"
};

type EnvInput = z.input<typeof envSchema>;
type EnvOutput = z.output<typeof envSchema>;
type SafeParseReturn = z.SafeParseReturnType<EnvInput, EnvOutput>;

let env = process.env as CustomProcessEnv;
if (!process.env.SKIP_ENV_VALIDATION) {
	const formatErrors = (errors: z.ZodFormattedError<Map<string, string>, string>) =>
		Object.entries(errors)
			.map(([name, value]) => {
				if (value && "_errors" in value) return `${name}: ${value._errors.join(", ")}\n`;
				return null;
			})
			.filter(Boolean);

	const parsedEnv = envSchema.safeParse(processEnv) as SafeParseReturn;

	if (!parsedEnv.success) {
		const error = formatErrors(parsedEnv.error.format());
		console.error("❌ Invalid environment variables:\n", ...error);
		throw new Error("Invalid environment variables\n" + error.join(""));
	}

	env = parsedEnv.data as CustomProcessEnv;
} else {
	env = processEnv as CustomProcessEnv;
}

export default env;
