/** Public-domain sample games for the homepage (copies of benchmarks/games/*.pgn). */
export interface SampleGame {
  id: string;
  title: string;
  subtitle: string;
  pgn: string;
}

export const SAMPLE_GAMES: SampleGame[] = [
  {
    id: "opera",
    title: "Opera Game",
    subtitle: "Morphy vs Duke Karl / Count Isouard, Paris 1858",
    pgn: "[Event \"Paris\"]\n[Site \"Paris FRA\"]\n[Date \"1858.??.??\"]\n[White \"Paul Morphy\"]\n[Black \"Duke Karl / Count Isouard\"]\n[Result \"1-0\"]\n[ECO \"C41\"]\n\n1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7\n8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7\n14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0",
  },
  {
    id: "kasparov",
    title: "Kasparov's Immortal",
    subtitle: "Kasparov vs Topalov, Wijk aan Zee 1999",
    pgn: "[Event \"Hoogovens\"]\n[Site \"Wijk aan Zee NED\"]\n[Date \"1999.01.20\"]\n[White \"Garry Kasparov\"]\n[Black \"Veselin Topalov\"]\n[Result \"1-0\"]\n[WhiteElo \"2812\"]\n[BlackElo \"2700\"]\n[ECO \"B07\"]\n\n1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6\n9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5\n16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5\n23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7\n30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2\n37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0",
  },
  {
    id: "legal",
    title: "Légal's mate",
    subtitle: "A classic trap in seven moves",
    pgn: "[Event \"Legal's mate (trap pattern)\"]\n[White \"White\"]\n[Black \"Black\"]\n[Result \"1-0\"]\n\n1. e4 e5 2. Nf3 d6 3. Bc4 Bg4 4. Nc3 g6 5. Nxe5 Bxd1 6. Bxf7+ Ke7 7. Nd5# 1-0",
  },
];
