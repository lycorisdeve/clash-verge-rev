import { DialogRef, Switch } from "@/components/base";
import { TooltipIcon } from "@/components/base/base-tooltip-icon";
import { useClash } from "@/hooks/use-clash";
import { useListen } from "@/hooks/use-listen";
import { useVerge } from "@/hooks/use-verge";
import { updateGeoData } from "@/services/api";
import { invoke_uwp_tool } from "@/services/cmds";
import { showNotice } from "@/services/noticeService";
import getSystem from "@/utils/get-system";
import { LanRounded, SettingsRounded } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Input,
  MenuItem,
  Select,
  Typography
} from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { useLockFn } from "ahooks";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClashCoreViewer } from "./mods/clash-core-viewer";
import { ClashPortViewer } from "./mods/clash-port-viewer";
import { ControllerViewer } from "./mods/controller-viewer";
import { DnsViewer } from "./mods/dns-viewer";
import { GuardState } from "./mods/guard-state";
import { NetworkInterfaceViewer } from "./mods/network-interface-viewer";
import { SettingItem, SettingList } from "./mods/setting-comp";
import { WebUIViewer } from "./mods/web-ui-viewer";

const isWIN = getSystem() === "windows";

interface Props {
  onError: (err: Error) => void;
}

const SettingClash = ({ onError }: Props) => {
  const { t } = useTranslation();

  const { clash, version, mutateClash, patchClash } = useClash();
  const { verge, mutateVerge, patchVerge } = useVerge();

  const {
    ipv6,
    "global-ua": ua,
    "global-client-fingerprint": global,
    "keep-alive-idle": keepidle,
    "keep-alive-interval": keepalive,
    "tcp-concurrent": tcp,
    "find-process-mode": find,
    "allow-lan": allowLan,
    "log-level": logLevel,
    "unified-delay": unifiedDelay,
    dns,
  } = clash ?? {};

  const { enable_random_port = false, verge_mixed_port } = verge ?? {};

  // 独立跟踪DNS设置开关状态
  const [dnsSettingsEnabled, setDnsSettingsEnabled] = useState(() => {
    return verge?.enable_dns_settings ?? false;
  });

  const { addListener } = useListen();

  const webRef = useRef<DialogRef>(null);
  const portRef = useRef<DialogRef>(null);
  const ctrlRef = useRef<DialogRef>(null);
  const coreRef = useRef<DialogRef>(null);
  const networkRef = useRef<DialogRef>(null);
  const dnsRef = useRef<DialogRef>(null);

  const onSwitchFormat = (_e: any, value: boolean) => value;
  const onChangeData = (patch: Partial<IConfigData>) => {
    mutateClash((old) => ({ ...(old! || {}), ...patch }), false);
  };
  const onChangeVerge = (patch: Partial<IVergeConfig>) => {
    mutateVerge({ ...verge, ...patch }, false);
  };
  const onUpdateGeo = async () => {
    try {
      await updateGeoData();
      showNotice("success", t("GeoData Updated"));
    } catch (err: any) {
      showNotice("error", err?.response.data.message || err.toString());
    }
  };

  // 实现DNS设置开关处理函数
  const handleDnsToggle = useLockFn(async (enable: boolean) => {
    try {
      setDnsSettingsEnabled(enable);
      localStorage.setItem("dns_settings_enabled", String(enable));
      await patchVerge({ enable_dns_settings: enable });
      await invoke("apply_dns_config", { apply: enable });
      setTimeout(() => {
        mutateClash();
      }, 500);
    } catch (err: any) {
      setDnsSettingsEnabled(!enable);
      localStorage.setItem("dns_settings_enabled", String(!enable));
      showNotice("error", err.message || err.toString());
      await patchVerge({ enable_dns_settings: !enable }).catch(() => {});
      throw err;
    }
  });

  return (
    <SettingList title={t("Clash Setting")}>
      <WebUIViewer ref={webRef} />
      <ClashPortViewer ref={portRef} />
      <ControllerViewer ref={ctrlRef} />
      <ClashCoreViewer ref={coreRef} />
      <NetworkInterfaceViewer ref={networkRef} />
      <DnsViewer ref={dnsRef} />

      <Accordion>
        <AccordionSummary
          aria-controls="common-config-panel"
          id="common-config-summary"
        >
          <Typography sx={{ color: 'text.primary' }}>{t("Common Configuration")}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <SettingItem
            label={t("Allow Lan")}
            extra={
              <TooltipIcon
                title={t("Network Interface")}
                color={"inherit"}
                icon={LanRounded}
                onClick={() => {
                  networkRef.current?.open();
                }}
              />
            }
          >
            <GuardState
              value={allowLan ?? false}
              valueProps="checked"
              onCatch={onError}
              onFormat={onSwitchFormat}
              onChange={(e) => onChangeData({ "allow-lan": e })}
              onGuard={(e) => patchClash({ "allow-lan": e })}
            >
              <Switch edge="end" />
            </GuardState>
          </SettingItem>

          <SettingItem
            label={t("IPv6")}
          >
            <GuardState
              value={ipv6 ?? false}
              valueProps="checked"
              onCatch={onError}
              onFormat={onSwitchFormat}
              onChange={(e) => onChangeData({ ipv6: e })}
              onGuard={(e) => patchClash({ ipv6: e })}
            >
              <Switch edge="end" />
            </GuardState>
          </SettingItem>

          <SettingItem
            label={t("Unified Delay")}
            extra={
              <TooltipIcon
                title={t("Unified Delay Info")}
                sx={{ color: 'text.secondary' }}
              />
            }
          >
            <GuardState
              value={unifiedDelay ?? false}
              valueProps="checked"
              onCatch={onError}
              onFormat={onSwitchFormat}
              onChange={(e) => onChangeData({ "unified-delay": e })}
              onGuard={(e) => patchClash({ "unified-delay": e })}
            >
              <Switch edge="end" />
            </GuardState>
          </SettingItem>

          <SettingItem
            label={t("TCP Concurrency")}
            extra={
              <TooltipIcon
                title={t("TCP ConcurrencyWhen accessing a web page, DNS resolution generally results in multiple IP addresses.")}
                sx={{ color: 'text.secondary' }}
              />
            }
          >
            <GuardState
              value={tcp ?? false}
              valueProps="checked"
              onCatch={onError}
              onFormat={onSwitchFormat}
              onChange={(e) => onChangeData({ "tcp-concurrent": e })}
              onGuard={(e) => patchClash({ "tcp-concurrent": e })}
            >
              <Switch edge="end" />
            </GuardState>
          </SettingItem>

          <SettingItem
            label={t("Log Level")}
            extra={
              <TooltipIcon
                title={t("Log Level Info")}
                sx={{ color: 'text.secondary' }}
              />
            }
          >
            <GuardState
              value={logLevel === "warn" ? "warning" : (logLevel ?? "info")}
              onCatch={onError}
              onFormat={(e: any) => e.target.value}
              onChange={(e) => onChangeData({ "log-level": e })}
              onGuard={(e) => patchClash({ "log-level": e })}
            >
              <Select size="small" sx={{ width: 120, "> div": { py: "7.5px" } }}>
                <MenuItem value="debug">Debug</MenuItem>
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="warning">Warn</MenuItem>
                <MenuItem value="error">Error</MenuItem>
                <MenuItem value="silent">Silent</MenuItem>
              </Select>
            </GuardState>
          </SettingItem>

          <SettingItem
            label={t("Port Config")}
            onClick={() => portRef.current?.open()}
            extra={
              <TooltipIcon
                title={t("Control port value")}
                sx={{ color: 'text.secondary' }}
              />
            }
          />

          <SettingItem onClick={() => webRef.current?.open()} label={t("Web UI")} />
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary
          aria-controls="advanced-config-panel"
          id="advanced-config-summary"
        >
           <Typography sx={{ color: 'text.primary' }}>{t("Advanced Configuration")}</Typography>
        </AccordionSummary>
        <AccordionDetails>

          <SettingItem
            label={t("DNS Overwrite")}
            extra={
              <TooltipIcon
                icon={SettingsRounded}
                onClick={() => dnsRef.current?.open()}
                sx={{ color: 'text.secondary' }}
              />
            }
          >
            <Switch
              edge="end"
              checked={dnsSettingsEnabled}
              onChange={(_, checked) => handleDnsToggle(checked)}
            />
          </SettingItem>

          <SettingItem
            label={t("Global UA")}
            extra={
              <TooltipIcon
                title={t("Global User-Agent, takes precedence over client-UA in proxy")}
                sx={{ color: 'text.secondary' }}
              />
            }
          >
            <GuardState
              value={ua || "clash-verge-rev/v2.3.0"}
              onCatch={onError}
              onFormat={(e: any) => e.target.value}
              onChange={(e) => onChangeData({ "global-ua": e })}
              onGuard={(e) => patchClash({ "global-ua": e })}
            >
              <Select
                size="small"
                sx={{ width: 120, "> div": { py: "7.5px" } }}
              >
                <MenuItem value="clash-verge-rev/v2.3.0">Release</MenuItem>
                <MenuItem value="clash-verge/v2.8.0">Verge</MenuItem>
                <MenuItem value="Clash-Meta/v1.18.0">Meta</MenuItem>
                <MenuItem value="Mihomo/v4.0.1">Mihomo</MenuItem>
                <MenuItem value="ClashforWindows/0.20.80">CFW</MenuItem>
                <MenuItem value="Clash-Premium/1.20.0">Premium</MenuItem>
                <MenuItem value="Clash/1.99.0">Clash</MenuItem>
              </Select>
            </GuardState>
          </SettingItem>

          <SettingItem
            label={t("Global TLS fingerprint")}
            extra={
              <TooltipIcon
                title={t("Global TLS fingerprint, takes precedence over client-fingerprint in proxy")}
                sx={{ color: 'text.secondary' }}
              />
            }
          >
            <GuardState
              value={global || "chrome"}
              onCatch={onError}
              onFormat={(e: any) => e.target.value}
              onChange={(e) => onChangeData({ "global-client-fingerprint": e })}
              onGuard={(e) => patchClash({ "global-client-fingerprint": e })}
            >
              <Select
                size="small"
                sx={{ width: 120, "> div": { py: "7.5px" } }}
              >
                <MenuItem value="chrome">Chrome</MenuItem>
                <MenuItem value="firefox">Firefox</MenuItem>
                <MenuItem value="safari">Safari</MenuItem>
                <MenuItem value="ios">iOS</MenuItem>
                <MenuItem value="android">Android</MenuItem>
                <MenuItem value="edge">Edge</MenuItem>
                <MenuItem value="360">360</MenuItem>
                <MenuItem value="qq">QQ</MenuItem>
                <MenuItem value="random">Random</MenuItem>
              </Select>
            </GuardState>
          </SettingItem>

          <SettingItem
            label={t("Process Matching Mode")}
            extra={
              <>
                <TooltipIcon
                  title={t("Controls whether Clash matches processes")}
                  sx={{ color: 'text.secondary' }}
                />
              </>
            }
          >
            <GuardState
              value={find || "strict"}
              onCatch={onError}
              onFormat={(e: any) => e.target.value}
              onChange={(e) => onChangeData({ "find-process-mode": e })}
              onGuard={(e) => patchClash({ "find-process-mode": e })}
            >
              <Select
                size="small"
                sx={{ width: 120, "> div": { py: "7.5px" } }}
              >
                <MenuItem value="always">Always</MenuItem>
                <MenuItem value="strict">Strict</MenuItem>
                <MenuItem value="off">Off</MenuItem>
              </Select>
            </GuardState>
          </SettingItem>

         <SettingItem
         label={t("TCP Keep Alive")}
         extra={
         <>
          <TooltipIcon
          title={t("The interval for TCP Keep Alive packets, measured in seconds")}
          sx={{ color: 'text.secondary' }}
         />
         </>
         }
      >
          <GuardState
          value={keepalive || 15}
          onCatch={onError}
          onFormat={(e) => {
          const value = e.target.value.trim();
          const num = parseInt(value, 10);
          if (isNaN(num) || num < 0) {
          throw new Error("请输入 0 或正整数");
          }
          return num;
          }}
             onChange={(e) => onChangeData({ "keep-alive-interval": e })}
            onGuard={(e) => patchClash({ "keep-alive-interval": e })}
      >
        <Input
          size="small"
         sx={{
          width: 120,
          "& input::placeholder": { color: "#6c757d" }
         }}
       />
         </GuardState>
      </SettingItem>

         <SettingItem
         label={t("TCP Keep Idle")}
         extra={
         <>
          <TooltipIcon
          title={t("The maximum idle time for TCP Keep Alive.")}
          sx={{ color: 'text.secondary' }}
         />
         </>
         }
      >
          <GuardState
          value={keepidle || 15}
          onCatch={onError}
          onFormat={(e) => {
          const value = e.target.value.trim();
          const num = parseInt(value, 10);
          if (isNaN(num) || num < 0) {
          throw new Error("请输入 0 或正整数");
          }
          return num;
          }}
             onChange={(e) => onChangeData({ "keep-alive-idle": e })}
            onGuard={(e) => patchClash({ "keep-alive-idle": e })}
      >
        <Input
          size="small"
         sx={{
          width: 120,
          "& input::placeholder": { color: "#6c757d" }
         }}
       />
         </GuardState>
      </SettingItem>

          <SettingItem
            onClick={() => ctrlRef.current?.open()}
            label={
              <>
                {t("External")}
                <TooltipIcon
                  title={t("Control API Port Key")}
                  sx={{ color: 'text.secondary' }}
                />
              </>
            }
          />
        </AccordionDetails>
      </Accordion>

      <SettingItem
        label={t("Clash Core")}
        extra={
          <TooltipIcon
            icon={SettingsRounded}
            onClick={() => coreRef.current?.open()}
            sx={{ color: 'text.secondary' }}
          />
        }
      >
        <Typography sx={{ py: "7px", pr: 1 }}>{version}</Typography>
      </SettingItem>

      {isWIN && (
        <SettingItem
          onClick={invoke_uwp_tool}
          label={t("Open UWP tool")}
          extra={
            <TooltipIcon
              title={t("Open UWP tool Info")}
              sx={{ color: 'text.secondary' }}
            />
          }
        />
      )}

      <SettingItem onClick={onUpdateGeo} label={t("Update GeoData")} />
    </SettingList>
  );
};

export default SettingClash;
