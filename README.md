# 그들도 우리와 같은 나이였다: 20대의 하루 (전시 사이트)

기획 국필호. 빌드 과정이 없는 정적 사이트이고, Render의 Static Site로 배포합니다.

## 화면

| 주소 | 내용 |
|---|---|
| `/` | 메인. 인물 선택(누르면 그 자리에서 바로 재생), 2026년 나의 하루 기록하기(원문 카드), 기획자의 하루 |
| `/#ch1-kubo` | 주소 끝에 인물 id를 붙이면 그 인물이 골라진 채로 열림. 인물별 QR에 쓰기 좋음 |
| `/play.html` | 상영관. 영상이 있는 구간만 순서대로 반복 재생 (전시장 TV용, 처음 한 번 누르면 전체화면) |
| `/work.html#id` | 구간별 상세 페이지 |
| `/participate.html` | 예전 참여 주소. 메인의 2026년 나의 하루 기록하기로 넘어감 |

인물 id: `ch1-kubo`(구보), `interlude2-sangroksu`(채영신), `ch2-takryu`(정초봉), `ch3-sampo`(백화), `ch4-quizshow`(이민수), `ch5-winter`(준성), 막간은 `interlude1`~`interlude12`.

## Render에 처음 배포하기

1. GitHub에서 새 저장소를 만듭니다. 예: `exhibition-20s`
2. 이 폴더 안의 파일과 폴더를 저장소 맨 위에 올립니다. 웹에서는 저장소 화면의 Add file -> Upload files에 끌어다 놓으면 됩니다.
   - `videos/` 안의 예전 영상 두 개(`ch1-kubo-draft-v6.mp4`, `interlude2-sangroksu-v2.mp4`)는 더 이상 쓰지 않으니 올리지 않습니다.
3. Render 대시보드에서 New -> Blueprint를 고르고 이 저장소를 연결합니다. 저장소의 `render.yaml` 설정대로 Static Site가 만들어집니다.
   - Blueprint 대신 직접 만들 때: New -> Static Site, 저장소 연결, Build Command는 `echo "no build step"`, Publish Directory는 `./`
4. 배포가 끝나면 `https://<서비스 이름>.onrender.com` 주소가 생깁니다. 이 주소로 QR을 만듭니다.
5. 이후 GitHub의 파일을 고치면 Render가 다시 배포합니다.

## 영상은 GitHub Pages에 따로 두기 (권장)

Render 무료(Hobby) 작업공간은 한 달에 나가는 트래픽이 5GB이고, 정적 사이트가 보내는 트래픽도 여기에 들어갑니다. 결제수단이 없으면 넘는 순간 그 달 말까지 서비스가 멈춥니다. 지금 영상 두 편이 합쳐 약 29MB라, 두 편을 끝까지 보는 사람이 170명쯤 되면 5GB에 닿습니다. 전시 당일 TV 루프까지 생각하면 영상은 Render 밖에 두는 편이 안전합니다.

GitHub Pages는 사이트 1GB, 한 달 100GB의 소프트 대역폭 한도가 있고, GitHub Free에서는 공개 저장소만 Pages로 낼 수 있습니다. 웹으로 올리는 파일은 하나에 25MiB까지라 지금 영상(각 약 15MB)은 웹 업로드로 됩니다.

1. GitHub에서 공개 저장소를 하나 더 만듭니다. 예: `exhibition-20s-media`
2. Add file -> Upload files에 `videos` 폴더를 통째로 끌어다 놓아, 저장소 안에 `videos/ch1-kubo-draft-v6-blue.mp4`, `videos/interlude2-sangroksu-v3.mp4`가 생기게 합니다.
3. 저장소 Settings -> Pages -> Build and deployment에서 Source를 Deploy from a branch, 브랜치를 `main`, 폴더를 `/ (root)`로 고르고 Save
4. 잠시 뒤 `https://<GitHub 아이디>.github.io/exhibition-20s-media/videos/ch1-kubo-draft-v6-blue.mp4`가 열리면 성공입니다.
5. 사이트 저장소의 `data/works.json` 맨 위 `"mediaBase"`에 `https://<GitHub 아이디>.github.io/exhibition-20s-media/`를 넣고 저장합니다. 사이트의 모든 영상(인물 선택, 상영관, 구간 페이지)이 그 주소에서 재생됩니다. 비워 두면 사이트 안의 `videos/`에서 재생합니다.

근거
- Render 대역폭: https://render.com/docs/outbound-bandwidth
- GitHub Pages 한도: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- GitHub Pages 공개 저장소 조건과 설정 순서: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- GitHub 파일 크기 한도: https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github

로컬에서 미리 보기: 이 폴더에서 `python3 -m http.server 8000` 실행 후 http://localhost:8000

## 내용 고치기

- 구간과 인물 정보: `data/works.json`
  - 영상 추가: `videos/`에 mp4를 넣고, 해당 구간의 `"video"`에 경로, `"poster"`에 대표 이미지, `"status"`를 `"draft"`로 바꿉니다.
  - 영상을 다른 곳에 올렸다면 `exhibition.mediaBase` 한 줄만 바꾸면 됩니다. 영상 하나만 다른 곳에 둘 때는 `"video"`에 그 mp4의 전체 주소(https://...)를 넣어도 됩니다.
  - 인물 선택 칩에 보이는 이름과 나이: `"person"`, `"personAge"`
- 원문 카드 장면: `data/days.json`
  - 지금은 원문 텍스트와 한 글자씩 대조한 구보, 채영신, 정초봉의 15개 장면만 들어 있습니다. 관람객의 하루는 이 장면들 안에서만 짝지어집니다.
  - 장면 하나의 필드: `time`(새벽, 아침, 낮, 오후, 저녁, 밤), `place`(이동, 길, 역, 카페, 일터, 학교, 집, 교회), `worry`(가족, 돈, 일, 외로움, 가르침, 글, 피곤, 배고픔, 결정), `item`(책, 노트, 돈, 밥), `quote`(원문 그대로), `src`, `diff`(그 인물만의 다른 조건), `diffSrc`(다른 조건의 근거)
  - 새 인물을 넣을 때도 원문을 직접 확인한 문장만 넣습니다.
- 기획자의 하루: `data/curator.txt`

## 2026년 나의 하루 기록하기 (원문 카드)

- 입력: 날짜, 시각, 있던 곳, 손에 든 것, 마음에 걸린 일, 나이(선택). 이름과 연락처는 받지 않습니다.
- 짝짓기: 시각이 같은 장면을 가장 크게 보고, 장소와 마음에 걸린 일, 손에 든 것, 나이가 겹치는 정도를 더해 가장 가까운 장면 하나를 고릅니다.
- 저장: 입력은 서버로 보내지 않고 그 휴대폰의 브라우저 저장소에만 남습니다. 카드는 이미지(1080x1350)로 저장하거나 공유할 수 있습니다.
- 전화번호나 이메일처럼 보이는 입력은 카드에 `(지움)`으로 바뀌어 들어갑니다.

## 관람객 아카이브 (다음 단계)

지금 사이트에는 서버 저장이 없습니다. 공개에 동의한 카드를 모아 루프 끝과 아카이브에 띄우려면 별도 데이터베이스가 필요합니다. 기획서의 계획대로 하면 Supabase 같은 외부 데이터베이스에 `submissions` 표(id, created_at, time, place, holding, worry, matched_line_id, consent, approved)를 만들고, 공개 동의와 검수를 거친 행만 보여 주는 구성이 됩니다. `data/archive.json`은 그 전까지 쓰는 빈 자리입니다.

## 확인할 것

- 제1장 구보 초안 영상과 원문 카드에는 박태원 「소설가 구보씨의 일일」 원문 문장이 들어 있습니다. 박태원은 1986년에 사망해 저작권 보호기간 안에 있으므로, 링크를 공개적으로 퍼뜨리기 전에 수업 내 상영 범위를 넘는지 확인이 필요합니다. 영상을 내리려면 `ch1-kubo`의 `"video"`를 `null`로, 카드에서 빼려면 `days.json`에서 `kubo-`로 시작하는 장면을 지웁니다.
- 영상 속 인물과 장면은 AI 재현이며, 사이트 하단과 인물 정보에 그렇게 표기했습니다.
