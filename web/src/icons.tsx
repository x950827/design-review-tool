import { SVGProps } from "react";

function Svg(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" {...props} />
  );
}

export function IconComments(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path
        d="M7 11H17M7 15H13M7 7H15M22 17C22 17.5304 21.7893 18.0391 21.4142 18.4142C21.0391 18.7893 20.5304 19 20 19H6.828C6.29761 19.0001 5.78899 19.2109 5.414 19.586L3.212 21.788C3.1127 21.8873 2.9862 21.9549 2.84849 21.9823C2.71077 22.0097 2.56803 21.9956 2.43831 21.9419C2.30858 21.8881 2.1977 21.7971 2.11969 21.6804C2.04167 21.5637 2.00002 21.4264 2 21.286V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H20C20.5304 3 21.0391 3.21071 21.4142 3.58579C21.7893 3.96086 22 4.46957 22 5V17Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconDock(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path
        d="M3 15H21M5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconChevronDown(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path
        d="M6 9L12 15L18 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconPhone(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path
        d="M12 18H12.01M6 2H18C19.1046 2 20 2.89543 20 4V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V4C4 2.89543 4.89543 2 6 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconDesktop(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path
        d="M20.054 15.9871H3.94604M18 5C18.5305 5 19.0392 5.21071 19.4142 5.58579C19.7893 5.96086 20 6.46957 20 7V15.526C19.9999 15.8374 20.0725 16.1446 20.212 16.423L21.28 18.55C21.3571 18.703 21.3936 18.8732 21.386 19.0444C21.3784 19.2155 21.327 19.3818 21.2366 19.5274C21.1463 19.6729 21.0201 19.7928 20.8701 19.8756C20.7201 19.9584 20.5513 20.0012 20.38 20H3.62002C3.44871 20.0012 3.27997 19.9584 3.12997 19.8756C2.97997 19.7928 2.85374 19.6729 2.7634 19.5274C2.67305 19.3818 2.62162 19.2155 2.61402 19.0444C2.60643 18.8732 2.64293 18.703 2.72002 18.55L3.78802 16.423C3.92756 16.1446 4.00016 15.8374 4.00002 15.526V7C4.00002 6.46957 4.21073 5.96086 4.58581 5.58579C4.96088 5.21071 5.46959 5 6.00002 5H18Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconBrowse(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path
        d="M10 10V9C10 8.46957 10.2107 7.96086 10.5858 7.58579C10.9609 7.21071 11.4696 7 12 7C12.5304 7 13.0391 7.21071 13.4142 7.58579C13.7893 7.96086 14 8.46957 14 9V10C14 9.46957 14.2107 8.96086 14.5858 8.58579C14.9609 8.21071 15.4696 8 16 8C16.5304 8 17.0391 8.21071 17.4142 8.58579C17.7893 8.96086 18 9.46957 18 10V11C18 10.4696 18.2107 9.96086 18.5858 9.58579C18.9608 9.21071 19.4695 9 20 9C20.5304 9 21.0391 9.21071 21.4142 9.58579C21.7893 9.96086 22 10.4696 22 11L22 14C22 16.1217 21.1571 18.1566 19.6569 19.6569C18.1566 21.1571 16.1217 22 14 22H12C9.19998 22 7.49998 21.14 6.00998 19.66L2.40998 16.06C2.06592 15.6789 1.88157 15.1802 1.89511 14.6669C1.90864 14.1537 2.11903 13.6653 2.4827 13.303C2.84638 12.9406 3.33548 12.7319 3.84875 12.7202C4.36202 12.7085 4.86014 12.8946 5.23998 13.24L6.99998 15M10 9.5V4C10 3.46957 9.78929 2.96086 9.41421 2.58579C9.03914 2.21071 8.53043 2 8 2C7.46957 2 6.96086 2.21071 6.58579 2.58579C6.21071 2.96086 6 3.46957 6 4V14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconRect(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path
        d="M15 5L19 9M21.1739 6.81189C21.7026 6.28332 21.9997 5.56636 21.9998 4.81875C21.9999 4.07113 21.703 3.3541 21.1744 2.82539C20.6459 2.29668 19.9289 1.99961 19.1813 1.99951C18.4337 1.99942 17.7166 2.29632 17.1879 2.82489L3.84193 16.1739C3.60975 16.4054 3.43805 16.6904 3.34193 17.0039L2.02093 21.3559C1.99509 21.4424 1.99314 21.5342 2.01529 21.6217C2.03743 21.7092 2.08285 21.7891 2.14673 21.8529C2.21061 21.9167 2.29055 21.962 2.37809 21.984C2.46563 22.006 2.55749 22.0039 2.64393 21.9779L6.99693 20.6579C7.3101 20.5626 7.59511 20.392 7.82693 20.1609L21.1739 6.81189Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconPlus(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path
        d="M12 5V19M5 12H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconGrip(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="9" cy="7" r="1.5" />
      <circle cx="15" cy="7" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="17" r="1.5" />
      <circle cx="15" cy="17" r="1.5" />
    </svg>
  );
}

export function IconRectBox(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
    </Svg>
  );
}

export function IconSend(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path
        d="M5 12H19M19 12L13 6M19 12L13 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconClose(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path
        d="M6 6L18 18M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconHideComments(props: SVGProps<SVGSVGElement>) {
  return (
    <>
      <Svg className="icon-side" {...props}>
        <path
          d="M15 3V21M8 9L11 12L8 15M5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Svg className="icon-down" {...props}>
        <path
          d="M6 9L12 15L18 9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </>
  );
}
