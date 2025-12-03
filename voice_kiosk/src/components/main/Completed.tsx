// /src/components/main/Completed.tsx
import checkImage from "@/assets/Check.png"; // ✅ 체크 이미지
import Header from "@/components/Header";
import Character from "@/components/Character";
import Captions from "@/components/Captions";

export default function Completed() {
  return (
    <div className="relative w-[1080px] h-[1920px]overflow-hidden">
      {/* HEADER */}
      <div className="absolute top-0 left-0 w-[1080px] h-36 overflow-hidden">
        <Header />
      </div>

      {/* CHARACTER */}
      <div className="absolute top-[149px] left-0 w-[1080px] h-[674px] flex justify-center">
        <Character />
      </div>

      {/* ✅ 체크 이미지 (카드 위치와 동일, z-0) */}
      <div className="absolute w-72 h-72 left-[401px] top-[1054px] z-0">
        <img
          src={checkImage}
          alt="결제 완료 체크 표시"
          className="w-72 h-72 object-contain animate-bounce"
        />
      </div>

      {/* CAPTION (카드보다 위, z-10) */}
      <div className="absolute w-[1080px] h-[895px] left-0 top-[823px] z-10">
        <div className="absolute left-[84px] top-[70px] w-[913px] h-56 text-center text-neutral-800 text-6xl font-semibold font-['Pretendard']">
          <Captions />
        </div>
      </div>
    </div>
  );
}
