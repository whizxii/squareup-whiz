import avatarImg from "@/assets/avatar-cx-lead.png";

const AvatarCXLead = ({ size = 220 }: { size?: number }) => (
  <img
    src={avatarImg}
    alt="CX & Experience Lead"
    width={size}
    height={size}
    style={{ width: size, height: size, objectFit: "contain", display: "block" }}
  />
);

export default AvatarCXLead;
